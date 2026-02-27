---
description: Use the EvaraTech CLI to manage backend, frontend, database, and nodes
---

# EvaraTech CLI

The CLI is at `d:\EvaraTech-Merged\cli.py`. Run from the project root.

## Quick Reference

```bash
# Health check (backend + frontend + DB + ThingSpeak)
python cli.py health check

# List all nodes
python cli.py nodes list

# Get full node details (with ThingSpeak, tank config, field mappings)
python cli.py nodes get <node-id>

# Create a node (interactive wizard)
python cli.py nodes create

# Update a node (interactive, shows current values)
python cli.py nodes update <node-id>

# Delete a node
python cli.py nodes delete <node-id>

# Test ThingSpeak channel connectivity
python cli.py ts test <channel-id> [api-key]

# Server management
python cli.py server start
python cli.py server stop
python cli.py server status

# Frontend management
python cli.py client start
python cli.py client stop
python cli.py client status

# Database
python cli.py db status
python cli.py db tables
python cli.py db migrate    # Shows SQL migration script
python cli.py db seed

# Environment config (with masked secrets)
python cli.py env show
```
