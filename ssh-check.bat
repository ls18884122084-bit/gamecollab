@echo off
echo y | ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 ubuntu@119.29.195.64 "command -v nginx; command -v certbot; hostname -I; dpkg -l | grep -E 'nginx|certbot' | head -5"
