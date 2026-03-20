# mcp admin panel — deployment guide

deploy the mcp admin panel to hostinger kvm 2 vps with bmcewan.info domain.

---

## step 1: purchase hostinger kvm 2

1. go to [hostinger.com/vps-hosting](https://www.hostinger.com/vps-hosting)
2. select **KVM 2** plan ($8.99/mo on 48-month, or $13.99/mo on 12-month)
3. during setup, choose:
   - **operating system:** Ubuntu 22.04
   - **server location:** closest to your users (UK → London or Amsterdam)
   - **root password:** set a strong password and save it somewhere safe
4. after purchase, go to **VPS → Manage** in the hostinger dashboard
5. note your **server IP address** (e.g., `123.45.67.89`)

---

## step 2: point dns at name.com

1. log in to [name.com](https://www.name.com)
2. go to **My Domains → bmcewan.info → DNS Records**
3. delete any existing A records for `@` and `www`
4. add two A records:

| type | host | value           | ttl  |
|------|------|-----------------|------|
| A    | @    | YOUR_SERVER_IP  | 300  |
| A    | www  | YOUR_SERVER_IP  | 300  |

5. save. dns propagation takes 5–30 minutes (sometimes up to 24 hours)

you can check propagation at: https://dnschecker.org/#A/bmcewan.info

---

## step 3: connect to your server via ssh

**on mac/linux (terminal):**
```bash
ssh root@YOUR_SERVER_IP
```

**on windows:**
- download [PuTTY](https://www.putty.org/) or use Windows Terminal
- connect to `root@YOUR_SERVER_IP`

enter the root password you set during hostinger setup.

---

## step 4: run the server setup script

once connected via ssh, run these commands:

```bash
# download the setup script from your github repo
git clone https://github.com/northlincseng-cell/mcp-admin-panel.git /tmp/mcp-setup
cd /tmp/mcp-setup/deploy

# run the server setup (installs node.js, postgresql, nginx, pm2)
sudo bash setup-server.sh
```

this takes about 3–5 minutes. when it finishes, it will display your database credentials.

**important:** copy the `DATABASE_URL` line it shows — you'll need it in the next step.

---

## step 5: deploy the application

```bash
# switch to the mcp user
su - mcp

# set the database url (paste the one from step 4)
export DATABASE_URL='postgresql://mcp_app:YOUR_PASSWORD@localhost:5432/mcp_admin'

# create logs directory
mkdir -p ~/logs

# run the deployment script
bash /tmp/mcp-setup/deploy/deploy-app.sh
```

after this completes, the app is running. test it:

```bash
curl http://localhost:5000
```

you should see html output. the app is live.

---

## step 6: enable ssl (https)

once dns has propagated (check at dnschecker.org), run as root:

```bash
# switch back to root
exit

# get ssl certificate
sudo certbot --nginx -d bmcewan.info -d www.bmcewan.info

# follow the prompts:
# - enter your email for renewal notices
# - agree to terms of service
# - choose to redirect http to https (recommended)
```

certbot auto-renews via a system timer. no maintenance needed.

---

## step 7: verify everything works

open your browser and go to: **https://bmcewan.info**

you should see the mcp admin panel dashboard with all the demo data.

---

## ongoing maintenance

### check app status
```bash
su - mcp
pm2 status
pm2 logs mcp-admin
```

### restart the app
```bash
su - mcp
pm2 restart mcp-admin
```

### deploy updates
when you push new code to github:
```bash
su - mcp
cd ~/mcp-admin-panel
git pull origin main
npm ci --production=false
npm run build
pm2 restart mcp-admin
```

### database backup
```bash
# as root — creates a compressed backup
sudo -u postgres pg_dump mcp_admin | gzip > /home/mcp/backups/mcp_admin_$(date +%Y%m%d_%H%M).sql.gz
```

### check ssl certificate renewal
```bash
sudo certbot renew --dry-run
```

---

## server specs (kvm 2)

| spec       | value          |
|------------|----------------|
| cpu        | 2 vCPU         |
| ram        | 8 GB           |
| storage    | 100 GB NVMe    |
| bandwidth  | 8 TB/month     |
| os         | Ubuntu 22.04   |

this is well within requirements for the mcp admin panel. the app uses ~100MB ram and minimal cpu.

---

## troubleshooting

**app won't start:**
```bash
su - mcp
pm2 logs mcp-admin --lines 50
# check for errors — usually a missing DATABASE_URL
```

**can't reach the site:**
```bash
# check nginx is running
sudo systemctl status nginx

# check the app is running
su - mcp && pm2 status

# check dns is pointed correctly
dig bmcewan.info
```

**database connection error:**
```bash
# check postgresql is running
sudo systemctl status postgresql

# test the connection
sudo -u postgres psql -d mcp_admin -c "SELECT count(*) FROM retailers;"
```

**ssl certificate issues:**
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```
