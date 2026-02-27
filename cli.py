#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║                    EvaraTech CLI                             ║
║           Project Management Command Center                  ║
╚══════════════════════════════════════════════════════════════╝

Usage:
    python cli.py <command> <subcommand> [options]

Commands:
    server    start | stop | status | restart | logs
    client    start | stop | status
    db        status | tables | migrate | seed
    nodes     list | get <id> | create | update <id> | delete <id>
    ts        test <channel_id> [api_key]    (ThingSpeak connectivity)
    health    check
    env       show
"""

import argparse
import json
import os
import subprocess
import sys
import textwrap
import time
import urllib.request
import urllib.error
import urllib.parse

# ─── CONFIG ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(PROJECT_ROOT, "server")
CLIENT_DIR = os.path.join(PROJECT_ROOT, "client")
VENV_PYTHON = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")
API_BASE = "http://127.0.0.1:8000/api/v1"
CLIENT_URL = "http://127.0.0.1:5174"
ENV_FILE = os.path.join(SERVER_DIR, ".env")

# ─── COLORS ─────────────────────────────────────────────────────────────────────
class C:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    END = "\033[0m"

def ok(msg):    print(f"  {C.GREEN}[OK] {msg}{C.END}")
def err(msg):   print(f"  {C.RED}[ERR] {msg}{C.END}")
def warn(msg):  print(f"  {C.YELLOW}[WARN] {msg}{C.END}")
def info(msg):  print(f"  {C.BLUE}[INFO] {msg}{C.END}")
def head(msg):  print(f"\n{C.BOLD}{C.CYAN}{'─'*60}\n  {msg}\n{'─'*60}{C.END}")

def banner():
    print(f"""{C.BOLD}{C.GREEN}
  ╔══════════════════════════════════════════╗
  ║         EvaraTech CLI  v1.0.0           ║
  ║      Project Management Console         ║
  ╚══════════════════════════════════════════╝{C.END}
""")

# ─── HTTP HELPERS ───────────────────────────────────────────────────────────────
def api_get(path):
    """GET request to the backend API."""
    url = f"{API_BASE}{path}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            return json.loads(body), e.code
        except:
            return {"detail": body or str(e)}, e.code
    except urllib.error.URLError as e:
        return {"detail": f"Connection failed: {e.reason}"}, 0
    except Exception as e:
        return {"detail": str(e)}, 0

def api_request(method, path, data=None):
    """Generic HTTP request to the backend API."""
    url = f"{API_BASE}{path}"
    body = json.dumps(data).encode() if data else None
    try:
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        try:
            return json.loads(body_text), e.code
        except:
            return {"detail": body_text or str(e)}, e.code
    except urllib.error.URLError as e:
        return {"detail": f"Connection failed: {e.reason}"}, 0
    except Exception as e:
        return {"detail": str(e)}, 0

def api_post(path, data):   return api_request("POST", path, data)
def api_put(path, data):    return api_request("PUT", path, data)
def api_delete(path):       return api_request("DELETE", path)

# ─── SERVER COMMANDS ────────────────────────────────────────────────────────────
def cmd_server(args):
    action = args.action
    
    if action == "start":
        head("Starting Backend Server")
        info(f"Using Python: {VENV_PYTHON}")
        info(f"Server dir: {SERVER_DIR}")
        cmd = f'Start-Process -FilePath "{VENV_PYTHON}" -ArgumentList "-m","uvicorn","main:app","--reload","--host","0.0.0.0","--port","8000" -WorkingDirectory "{SERVER_DIR}" -WindowStyle Normal'
        subprocess.run(["powershell", "-Command", cmd], cwd=SERVER_DIR)
        time.sleep(2)
        ok("Backend server starting on http://localhost:8000")
        info("Use 'python cli.py server status' to check if it's ready")
        
    elif action == "stop":
        head("Stopping Backend Server")
        subprocess.run(["powershell", "-Command", 
            'Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force'],
            capture_output=True)
        ok("Backend server stopped")
        
    elif action == "restart":
        head("Restarting Backend Server")
        cmd_server(argparse.Namespace(action="stop"))
        time.sleep(1)
        cmd_server(argparse.Namespace(action="start"))
        
    elif action == "status":
        head("Backend Server Status")
        data, code = api_get("/nodes/health")
        if code == 200:
            ok(f"Server is {C.GREEN}RUNNING{C.END}")
            print(f"    Database: {data.get('database', '?')}")
            print(f"    Nodes:    {data.get('node_count', '?')}")
            print(f"    Time:     {data.get('timestamp', '?')}")
        elif code == 0:
            err("Server is NOT RUNNING")
            info("Start it with: python cli.py server start")
        else:
            warn(f"Server returned {code}: {data}")
            
    elif action == "logs":
        head("Backend Server Logs (last 50 lines)")
        # Show recent output from uvicorn
        subprocess.run(["powershell", "-Command",
            'Get-Process -Name python -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime -AutoSize'],
            cwd=SERVER_DIR)

# ─── CLIENT COMMANDS ────────────────────────────────────────────────────────────
def cmd_client(args):
    action = args.action
    
    if action == "start":
        head("Starting Frontend Dev Server")
        info(f"Client dir: {CLIENT_DIR}")
        cmd = f'Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "{PROJECT_ROOT}" -WindowStyle Normal'
        subprocess.run(["powershell", "-Command", cmd], cwd=PROJECT_ROOT)
        time.sleep(2)
        ok(f"Frontend starting on {CLIENT_URL}")
        
    elif action == "stop":
        head("Stopping Frontend Dev Server")
        subprocess.run(["powershell", "-Command",
            'Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force'],
            capture_output=True)
        ok("Frontend server stopped")
        
    elif action == "status":
        head("Frontend Client Status")
        try:
            req = urllib.request.Request(CLIENT_URL)
            with urllib.request.urlopen(req, timeout=5) as resp:
                ok(f"Frontend is {C.GREEN}RUNNING{C.END} at {CLIENT_URL}")
        except:
            err(f"Frontend is NOT RUNNING at {CLIENT_URL}")
            info("Start it with: python cli.py client start")

# ─── DATABASE COMMANDS ──────────────────────────────────────────────────────────
def cmd_db(args):
    action = args.action
    
    if action == "status":
        head("Database Status")
        data, code = api_get("/nodes/health")
        if code == 200:
            ok(f"Database: {data.get('database', 'unknown')}")
            print(f"    Node count: {data.get('node_count', '?')}")
        elif code == 0:
            err("Cannot reach API — server may be down")
        else:
            err(f"Database issue: {data}")
            
    elif action == "tables":
        head("Database Tables")
        script = textwrap.dedent("""
import asyncio
from sqlalchemy import inspect
from app.db.session import engine

async def show_tables():
    async with engine.connect() as conn:
        def get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
        tables = await conn.run_sync(get_tables)
        for t in sorted(tables):
            print(f"  - {t}")
        print(f"\\n  Total: {len(tables)} tables")

asyncio.run(show_tables())
""")
        tmp = os.path.join(SERVER_DIR, "_cli_tables.py")
        with open(tmp, "w") as f:
            f.write(script)
        subprocess.run([VENV_PYTHON, tmp], cwd=SERVER_DIR)
        os.remove(tmp)
        
    elif action == "migrate":
        head("Database Migration")
        warn("Run the following SQL in your Supabase SQL Editor:")
        print(f"""
{C.CYAN}-- Update device_config_tank table
ALTER TABLE device_config_tank
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS max_depth,
  DROP COLUMN IF EXISTS temp_enabled,
  ADD COLUMN IF NOT EXISTS tank_shape VARCHAR,
  ADD COLUMN IF NOT EXISTS dimension_unit VARCHAR DEFAULT 'm',
  ADD COLUMN IF NOT EXISTS radius FLOAT,
  ADD COLUMN IF NOT EXISTS height FLOAT,
  ADD COLUMN IF NOT EXISTS length FLOAT,
  ADD COLUMN IF NOT EXISTS breadth FLOAT;

-- Drop unused columns from nodes table
ALTER TABLE nodes
  DROP COLUMN IF EXISTS sampling_rate,
  DROP COLUMN IF EXISTS threshold_low,
  DROP COLUMN IF EXISTS threshold_high,
  DROP COLUMN IF EXISTS sms_enabled,
  DROP COLUMN IF EXISTS dashboard_visible,
  DROP COLUMN IF EXISTS logic_inverted,
  DROP COLUMN IF EXISTS is_individual,
  DROP COLUMN IF EXISTS metrics_config;{C.END}
""")

    elif action == "seed":
        head("Seeding Database")
        info("Running seeder via API startup...")
        script = textwrap.dedent("""
import asyncio
from app.db.session import get_db, engine
from app.services.seeder import seed_database

async def run_seed():
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        await seed_database(db)
        print("  [OK] Seeding complete!")

asyncio.run(run_seed())
""")
        tmp = os.path.join(SERVER_DIR, "_cli_seed.py")
        with open(tmp, "w") as f:
            f.write(script)
        subprocess.run([VENV_PYTHON, tmp], cwd=SERVER_DIR)
        os.remove(tmp)

# ─── NODE COMMANDS ──────────────────────────────────────────────────────────────
def cmd_nodes(args):
    action = args.action
    
    if action == "list":
        head("All Nodes")
        data, code = api_get("/nodes/")
        if code != 200:
            err(f"Failed ({code}): {data.get('detail', data)}")
            return
            
        nodes = data if isinstance(data, list) else data.get("nodes", data)
        
        # Table header
        print(f"\n  {C.BOLD}{'ID':<40} {'Label':<20} {'Type':<12} {'Status':<14} {'Channel':<10}{C.END}")
        print(f"  {'─'*96}")
        
        for n in nodes:
            nid = n.get('id', '?')[:38]
            label = (n.get('label', '?') or '?')[:18]
            ntype = (n.get('analytics_type', '?') or '?')[:10]
            status = n.get('status', '?') or '?'
            ch = n.get('thingspeak_channel_id', '') or '—'
            
            status_color = C.GREEN if status == 'Online' else C.YELLOW if status == 'provisioning' else C.RED
            print(f"  {nid:<40} {label:<20} {ntype:<12} {status_color}{status:<14}{C.END} {ch:<10}")
        
        print(f"\n  {C.DIM}Total: {len(nodes)} nodes{C.END}")

    elif action == "get":
        if not args.id:
            err("Please provide a node ID: python cli.py nodes get <id>")
            return
        head(f"Node Details: {args.id}")
        data, code = api_get(f"/nodes/{args.id}")
        if code != 200:
            err(f"Failed ({code}): {data.get('detail', data)}")
            return
        
        print(f"\n  {C.BOLD}Basic Info{C.END}")
        print(f"    ID:             {data.get('id')}")
        print(f"    Hardware Key:   {data.get('node_key')}")
        print(f"    Label:          {data.get('label')}")
        print(f"    Category:       {data.get('category')}")
        print(f"    Analytics Type: {data.get('analytics_type')}")
        print(f"    Status:         {data.get('status')}")
        print(f"    Created:        {data.get('created_at')}")
        
        print(f"\n  {C.BOLD}Location{C.END}")
        print(f"    Latitude:       {data.get('lat', '—')}")
        print(f"    Longitude:      {data.get('lng', '—')}")
        print(f"    Location Name:  {data.get('location_name', '—')}")
        
        print(f"\n  {C.BOLD}ThingSpeak{C.END}")
        ts = data.get('thingspeak_mappings', [])
        if ts and len(ts) > 0:
            m = ts[0]
            print(f"    Channel ID:     {m.get('channel_id', '—')}")
            key = m.get('read_api_key', '—')
            print(f"    Read API Key:   {'••••' + key[-4:] if key and key != '—' else '—'}")
            fm = m.get('field_mapping', {})
            if fm:
                print(f"    Field Mapping:  {json.dumps(fm, indent=6)}")
        else:
            ch = data.get('thingspeak_channel_id', '—')
            print(f"    Channel ID:     {ch}")
            print(f"    Read API Key:   {'Set' if data.get('thingspeak_read_api_key') else '—'}")

        tc = data.get('config_tank')
        if tc:
            print(f"\n  {C.BOLD}Tank Configuration{C.END}")
            print(f"    Shape:          {tc.get('tank_shape', '—')}")
            print(f"    Unit:           {tc.get('dimension_unit', '—')}")
            if tc.get('tank_shape') == 'cylinder':
                print(f"    Radius:         {tc.get('radius', '—')}")
                print(f"    Height:         {tc.get('height', '—')}")
            else:
                print(f"    Length:         {tc.get('length', '—')}")
                print(f"    Breadth:        {tc.get('breadth', '—')}")
                print(f"    Height:         {tc.get('height', '—')}")

        dc = data.get('config_deep')
        if dc:
            print(f"\n  {C.BOLD}Deep Configuration{C.END}")
            print(f"    Static Depth:   {dc.get('static_depth', '—')}")
            print(f"    Dynamic Depth:  {dc.get('dynamic_depth', '—')}")
            print(f"    Recharge Thres: {dc.get('recharge_threshold', '—')}")

        fc = data.get('config_flow')
        if fc:
            print(f"\n  {C.BOLD}Flow Configuration{C.END}")
            print(f"    Pipe Diameter:  {fc.get('pipe_diameter', '—')}")
            print(f"    Max Flow Rate:  {fc.get('max_flow_rate', '—')}")
        
        print()

    elif action == "create":
        head("Create New Node (Interactive)")
        print()
        hw_id = input(f"  {C.CYAN}Hardware ID:{C.END} ").strip()
        label = input(f"  {C.CYAN}Device Label:{C.END} ").strip()
        dev_type = input(f"  {C.CYAN}Device Type (tank/deep/flow/custom):{C.END} ").strip() or "tank"
        analytics = input(f"  {C.CYAN}Analytics Type (EvaraTank/EvaraDeep/EvaraFlow):{C.END} ").strip() or "EvaraTank"
        channel_id = input(f"  {C.CYAN}ThingSpeak Channel ID (optional):{C.END} ").strip()
        read_key = input(f"  {C.CYAN}ThingSpeak Read API Key (optional):{C.END} ").strip()
        lat = input(f"  {C.CYAN}Latitude (optional):{C.END} ").strip()
        lng = input(f"  {C.CYAN}Longitude (optional):{C.END} ").strip()
        
        payload = {
            "hardware_id": hw_id,
            "device_label": label,
            "device_type": dev_type,
            "analytics_type": analytics,
        }
        if lat: payload["lat"] = float(lat)
        if lng: payload["long"] = float(lng)
        if channel_id:
            payload["thingspeak_mappings"] = [{
                "channel_id": channel_id,
                "read_api_key": read_key,
            }]
        
        # Tank config
        if analytics == "EvaraTank":
            shape = input(f"  {C.CYAN}Tank Shape (cylinder/rectangular):{C.END} ").strip() or "cylinder"
            unit = input(f"  {C.CYAN}Dimension Unit (m/cm/feet/inches):{C.END} ").strip() or "m"
            tank_cfg = {"tank_shape": shape, "dimension_unit": unit}
            if shape == "cylinder":
                r = input(f"  {C.CYAN}Radius:{C.END} ").strip()
                h = input(f"  {C.CYAN}Height:{C.END} ").strip()
                if r: tank_cfg["radius"] = float(r)
                if h: tank_cfg["height"] = float(h)
            else:
                l = input(f"  {C.CYAN}Length:{C.END} ").strip()
                b = input(f"  {C.CYAN}Breadth:{C.END} ").strip()
                h = input(f"  {C.CYAN}Height:{C.END} ").strip()
                if l: tank_cfg["length"] = float(l)
                if b: tank_cfg["breadth"] = float(b)
                if h: tank_cfg["height"] = float(h)
            payload["config_tank"] = tank_cfg
        
        print(f"\n  {C.DIM}Payload: {json.dumps(payload, indent=4)}{C.END}")
        confirm = input(f"\n  {C.YELLOW}Create this node? (y/n):{C.END} ").strip().lower()
        if confirm != 'y':
            warn("Cancelled")
            return
        
        data, code = api_post("/nodes", payload)
        if code in (200, 201):
            ok(f"Node created! ID: {data.get('id')}")
        else:
            err(f"Failed ({code}): {data.get('detail', data)}")

    elif action == "update":
        if not args.id:
            err("Please provide a node ID: python cli.py nodes update <id>")
            return
        head(f"Update Node: {args.id}")
        
        # Fetch current data
        current, code = api_get(f"/nodes/{args.id}")
        if code != 200:
            err(f"Failed to fetch node ({code}): {current.get('detail', current)}")
            return
        
        print(f"  Current: {current.get('label')} ({current.get('node_key')})")
        print(f"  {C.DIM}Press Enter to keep current value{C.END}\n")
        
        label = input(f"  {C.CYAN}Label [{current.get('label')}]:{C.END} ").strip() or current.get('label')
        lat = input(f"  {C.CYAN}Latitude [{current.get('lat')}]:{C.END} ").strip()
        lng = input(f"  {C.CYAN}Longitude [{current.get('lng')}]:{C.END} ").strip()
        
        ts = current.get('thingspeak_mappings', [{}])
        ts_mapping = ts[0] if ts else {}
        ch = input(f"  {C.CYAN}ThingSpeak Channel [{ts_mapping.get('channel_id', '—')}]:{C.END} ").strip()
        key = input(f"  {C.CYAN}Read API Key [{ts_mapping.get('read_api_key', '—')[:4] + '...' if ts_mapping.get('read_api_key') else '—'}]:{C.END} ").strip()
        
        payload = {
            "node_key": current.get('node_key'),
            "label": label,
            "category": current.get('category'),
            "analytics_type": current.get('analytics_type'),
            "lat": float(lat) if lat else current.get('lat'),
            "lng": float(lng) if lng else current.get('lng'),
        }
        
        final_ch = ch or ts_mapping.get('channel_id')
        final_key = key or ts_mapping.get('read_api_key')
        if final_ch:
            payload["thingspeak_mappings"] = [{"channel_id": final_ch, "read_api_key": final_key}]
        
        data, code = api_put(f"/nodes/{args.id}", payload)
        if code == 200:
            ok("Node updated successfully!")
        else:
            err(f"Failed ({code}): {data.get('detail', data)}")

    elif action == "delete":
        if not args.id:
            err("Please provide a node ID: python cli.py nodes delete <id>")
            return
        head(f"Delete Node: {args.id}")
        
        # Confirm
        current, code = api_get(f"/nodes/{args.id}")
        if code == 200:
            print(f"  Node: {current.get('label')} ({current.get('node_key')})")
        
        confirm = input(f"\n  {C.RED}Are you sure? This cannot be undone (y/n):{C.END} ").strip().lower()
        if confirm != 'y':
            warn("Cancelled")
            return
        
        data, code = api_delete(f"/nodes/{args.id}")
        if code == 200:
            ok("Node deleted!")
        else:
            err(f"Failed ({code}): {data.get('detail', data)}")

# ─── THINGSPEAK COMMANDS ────────────────────────────────────────────────────────
def cmd_ts(args):
    action = args.action
    
    if action == "test":
        channel = args.id
        if not channel:
            err("Usage: python cli.py ts test <channel_id> [api_key]")
            return
        api_key = args.extra if hasattr(args, 'extra') and args.extra else None
        
        head(f"ThingSpeak Connectivity Test: Channel {channel}")
        
        url = f"https://api.thingspeak.com/channels/{channel}/feeds.json?results=1"
        if api_key:
            url += f"&api_key={api_key}"
        
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                ch_info = data.get('channel', {})
                feeds = data.get('feeds', [])
                
                ok(f"Channel: {ch_info.get('name', '?')}")
                print(f"    ID:          {ch_info.get('id')}")
                print(f"    Description: {ch_info.get('description', '—')}")
                print(f"    Created:     {ch_info.get('created_at', '—')}")
                print(f"    Updated:     {ch_info.get('updated_at', '—')}")
                
                # Show fields
                print(f"\n  {C.BOLD}Fields:{C.END}")
                for i in range(1, 9):
                    fname = ch_info.get(f'field{i}')
                    if fname:
                        latest = feeds[0].get(f'field{i}', '—') if feeds else '—'
                        print(f"    field{i}: {fname} = {latest}")
                
                if feeds:
                    print(f"\n  {C.BOLD}Latest Reading:{C.END}")
                    print(f"    Time:    {feeds[0].get('created_at', '—')}")
                    print(f"    Entry:   #{feeds[0].get('entry_id', '—')}")
                    ok("ThingSpeak is reachable and returning data!")
                else:
                    warn("Channel exists but no data feeds found")
        except urllib.error.HTTPError as e:
            err(f"HTTP Error {e.code}: {e.reason}")
            if e.code == 404:
                info("Channel not found — check the channel ID")
            elif e.code == 401:
                info("Private channel — provide an API key: python cli.py ts test <id> <key>")
        except Exception as e:
            err(f"Connection failed: {e}")

# ─── HEALTH CHECK COMMAND ───────────────────────────────────────────────────────
def cmd_health(args):
    head("System Health Check")
    
    # 1. Backend API — use /nodes/ which always exists
    print(f"\n  {C.BOLD}1. Backend API{C.END}")
    data, code = api_get("/nodes/")
    if code == 200:
        nodes = data if isinstance(data, list) else data.get("nodes", [])
        ok(f"API Server:  UP (http://localhost:8000)")
        ok(f"Database:    Connected")
        online = sum(1 for n in nodes if n.get('status') == 'Online')
        ts_configured = sum(1 for n in nodes if n.get('thingspeak_channel_id'))
        print(f"\n  {C.BOLD}2. Node Summary{C.END}")
        print(f"    Total:    {len(nodes)}")
        print(f"    Online:   {online}")
        print(f"    With TS:  {ts_configured}")
    elif code == 0:
        err("API Server:  DOWN")
        info("Start it with: python cli.py server start")
    else:
        warn(f"API Server:  Responding but status {code}: {data.get('detail', '')}")
    
    # 2. Frontend
    print(f"\n  {C.BOLD}3. Frontend{C.END}")
    try:
        req = urllib.request.Request(CLIENT_URL)
        with urllib.request.urlopen(req, timeout=5):
            ok(f"Vite Dev:    UP ({CLIENT_URL})")
    except:
        err(f"Vite Dev:    DOWN ({CLIENT_URL})")
    
    # 3. ThingSpeak (quick test)
    print(f"\n  {C.BOLD}4. ThingSpeak API{C.END}")
    try:
        req = urllib.request.Request("https://api.thingspeak.com/channels/public.json?page=1")
        with urllib.request.urlopen(req, timeout=5):
            ok("ThingSpeak:  Reachable")
    except:
        err("ThingSpeak:  Unreachable")
    
    print()

# ─── ENV COMMAND ────────────────────────────────────────────────────────────────
def cmd_env(args):
    head("Environment Configuration")
    
    if os.path.exists(ENV_FILE):
        ok(f"Env file found: {ENV_FILE}")
        print()
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                key = line.split('=')[0] if '=' in line else line
                value = line.split('=', 1)[1] if '=' in line else ''
                # Mask sensitive values
                sensitive = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN']
                if any(s in key.upper() for s in sensitive) and value:
                    masked = value[:4] + '••••' + value[-4:] if len(value) > 8 else '••••'
                    print(f"    {C.CYAN}{key}{C.END} = {masked}")
                else:
                    print(f"    {C.CYAN}{key}{C.END} = {value[:60]}")
    else:
        err(f"No .env file found at {ENV_FILE}")
    print()

# ─── MAIN ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="EvaraTech Project CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
Examples:
  python cli.py health check           Full system health check
  python cli.py nodes list             List all nodes
  python cli.py nodes get <id>         Get node details
  python cli.py nodes create           Interactive node creation
  python cli.py ts test 2613745        Test ThingSpeak channel
  python cli.py server status          Check backend status
  python cli.py db tables              Show database tables
  python cli.py env show               Show environment config
        """)
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command group")
    
    # Server
    sp = subparsers.add_parser("server", help="Backend server management")
    sp.add_argument("action", choices=["start", "stop", "restart", "status", "logs"])
    sp.set_defaults(func=cmd_server)
    
    # Client
    sp = subparsers.add_parser("client", help="Frontend dev server management")
    sp.add_argument("action", choices=["start", "stop", "status"])
    sp.set_defaults(func=cmd_client)
    
    # Database
    sp = subparsers.add_parser("db", help="Database operations")
    sp.add_argument("action", choices=["status", "tables", "migrate", "seed"])
    sp.set_defaults(func=cmd_db)
    
    # Nodes
    sp = subparsers.add_parser("nodes", help="Node CRUD operations")
    sp.add_argument("action", choices=["list", "get", "create", "update", "delete"])
    sp.add_argument("id", nargs="?", default=None, help="Node ID (for get/update/delete)")
    sp.set_defaults(func=cmd_nodes)
    
    # ThingSpeak
    sp = subparsers.add_parser("ts", help="ThingSpeak tools")
    sp.add_argument("action", choices=["test"])
    sp.add_argument("id", nargs="?", default=None, help="Channel ID")
    sp.add_argument("extra", nargs="?", default=None, help="API Key (optional)")
    sp.set_defaults(func=cmd_ts)
    
    # Health
    sp = subparsers.add_parser("health", help="System health check")
    sp.add_argument("action", nargs="?", default="check", choices=["check"])
    sp.set_defaults(func=cmd_health)
    
    # Env
    sp = subparsers.add_parser("env", help="Environment configuration")
    sp.add_argument("action", nargs="?", default="show", choices=["show"])
    sp.set_defaults(func=cmd_env)
    
    args = parser.parse_args()
    
    banner()
    
    if not args.command:
        parser.print_help()
        return
    
    args.func(args)

if __name__ == "__main__":
    main()
