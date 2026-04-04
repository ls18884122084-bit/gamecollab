@echo off
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 ubuntu@119.29.195.64 "hostname && whoami && uptime"
