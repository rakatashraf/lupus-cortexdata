"""One local worker process, durable status/logs, restart-safe granule checkpoints."""
import json,os,subprocess,sys,threading
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException
from fastapi.responses import FileResponse
from collector import atomic_json,redacted

ROOT=Path(__file__).resolve().parent
WORK=Path(os.getenv('WORK_DIR','/data/work'))
FINAL=Path(os.getenv('OUTPUT_FILE','/data/lupus_cortex_2025_actual.csv'))
LOCK=threading.Lock();THREAD=None;PROC=None

def read_status():
    p=WORK/'progress.json'
    try:s=json.loads(p.read_text())
    except (FileNotFoundError,json.JSONDecodeError):s={'status':'idle'}
    s.update(output_file=str(FINAL),output_bytes=FINAL.stat().st_size if FINAL.exists() else 0)
    return s

def configured():
    return bool(os.getenv('EARTHDATA_TOKEN','').strip() or (os.getenv('EARTHDATA_USERNAME') and os.getenv('EARTHDATA_PASSWORD')))

def execute(inventory=False,smoke=False):
    global PROC
    WORK.mkdir(parents=True,exist_ok=True)
    # A smoke test gets a separate state database so it cannot contaminate full-run checkpoints.
    runwork=WORK/'smoke' if smoke else WORK
    env=os.environ.copy()
    if smoke:env['OUTPUT_FILE']=str(WORK/'smoke'/'smoke_actual.csv')
    cmd=[sys.executable,'-u',str(ROOT/'pipeline.py'),'--out',str(runwork)]
    if inventory:cmd.append('--inventory-only')
    if smoke:cmd+=['--max-granules','1']
    try:
        with (WORK/'pipeline.log').open('a',encoding='utf-8') as log:
            PROC=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env)
            code=PROC.wait()
        if smoke:
            result=json.loads((runwork/'progress.json').read_text())
            result['stage']='smoke test finished';result['smoke_test']=True
            atomic_json(WORK/'progress.json',result)
        elif code and read_status().get('status')!='failed':
            atomic_json(WORK/'progress.json',{'status':'failed','error':f'Worker exited with code {code}; see persistent pipeline.log. Resume keeps committed granules.'})
    except Exception as e:atomic_json(WORK/'progress.json',{'status':'failed','error':redacted(e)})
    finally:PROC=None

def start(inventory=False,smoke=False):
    global THREAD
    with LOCK:
        if THREAD and THREAD.is_alive():return read_status()
        if not inventory and not configured():raise HTTPException(400,'Set Earthdata credentials in .env, then docker compose up -d --force-recreate earthdata-worker')
        atomic_json(WORK/'progress.json',{'status':'running','stage':'starting','training_ready':False})
        THREAD=threading.Thread(target=execute,args=(inventory,smoke),daemon=True);THREAD.start()
    return read_status()

@asynccontextmanager
async def lifespan(app):
    prior=read_status()
    if prior.get('status')=='running':
        # Resume is explicit so the user can update credentials/config first.
        prior.update(status='interrupted',error='Worker restarted. Execute workflow again to resume saved granules.')
        atomic_json(WORK/'progress.json',prior)
    yield
    if PROC and PROC.poll() is None:
        PROC.terminate()
        try:PROC.wait(timeout=10)
        except subprocess.TimeoutExpired:PROC.kill();PROC.wait()

app=FastAPI(title='Lupus Cortex local collector',version='2.0',lifespan=lifespan)
@app.get('/health')
def health():return {'ok':True,'credentials_configured':configured(),'output_file':str(FINAL)}
@app.get('/preflight')
def preflight():
    import rasterio
    with rasterio.Env() as env:drivers=env.drivers();hdf4=any('HDF4' in d for d in drivers)
    return {'ok':configured() and hdf4,'credentials_configured':configured(),'hdf4_supported':hdf4,
        'note':'Credentials configured does not prove valid download access; smoke test verifies each source.'}
@app.post('/run')
def run():return start()
@app.post('/inventory')
def inventory():return start(inventory=True)
@app.post('/smoke')
def smoke():return start(smoke=True)
@app.get('/status')
def status():return read_status()
@app.get('/result')
def result():
    if not FINAL.exists():raise HTTPException(409,read_status())
    return FileResponse(FINAL,media_type='text/csv',filename=FINAL.name,headers={'X-Dataset-Status':read_status().get('status','unknown'),'X-Training-Ready':'false'})
@app.get('/logs')
def logs():
    path=WORK/'pipeline.log'
    if not path.exists():return {'lines':[]}
    with path.open('rb') as f:
        f.seek(max(0,path.stat().st_size-30000));tail=f.read().decode('utf-8',errors='replace')
    return {'lines':redacted(tail).splitlines()[-40:]}
