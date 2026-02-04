#!/bin/bash

# SSH Key Setup Script for SafePsy Deployment
# Run this script to add your SSH key to the server

# Configuration - Values are stored in Scaleway Secret Manager or environment
# Access via: getSecret('safepsy-credentials', 'infrastructure.ssh.serverIp')
SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
# SSH key from environment (never hardcode)
SSH_KEY="${SSH_PUBLIC_KEY:-}"

# Try to get SSH key from default location if not set
if [ -z "$SSH_KEY" ] && [ -f ~/.ssh/id_ed25519.pub ]; then
    SSH_KEY=$(cat ~/.ssh/id_ed25519.pub)
    echo "ℹ️  Using SSH key from ~/.ssh/id_ed25519.pub"
elif [ -z "$SSH_KEY" ] && [ -f ~/.ssh/id_rsa.pub ]; then
    SSH_KEY=$(cat ~/.ssh/id_rsa.pub)
    echo "ℹ️  Using SSH key from ~/.ssh/id_rsa.pub"
fi

echo "🔑 Setting up SSH key for SafePsy deployment"
echo "Server: $SERVER_IP"
echo ""

echo "Option 1: Manual SSH key setup (Recommended)"
echo "============================================="
echo ""
echo "1. Connect to your server:"
echo "   ssh root@$SERVER_IP"
echo ""
echo "2. Add your SSH key:"
echo "   mkdir -p ~/.ssh"
echo "   chmod 700 ~/.ssh"
if [ -n "$SSH_KEY" ]; then
    echo "   echo '$SSH_KEY' >> ~/.ssh/authorized_keys"
    echo ""
    echo "   Or copy this key:"
    echo "   $SSH_KEY"
else
    echo "   cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys"
    echo "   (or copy your public key manually)"
fi
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "3. Test SSH connection:"
echo "   ssh root@$SERVER_IP 'echo \"SSH key setup successful!\"'"
echo ""
echo "Option 2: Use Scaleway Console"
echo "=============================="
echo ""
echo "1. Log into your Scaleway console"
echo "2. Go to your instance"
echo "3. Add the SSH key through the console interface"
if [ -n "$SSH_KEY" ]; then
    echo "4. The key to add is:"
    echo "   $SSH_KEY"
else
    echo "4. Use your public key from ~/.ssh/id_ed25519.pub or ~/.ssh/id_rsa.pub"
fi
echo ""
echo "Option 3: Automated setup (requires password)"
echo "============================================="
echo ""
echo "If you want to use password authentication to set up the key,"
echo "you can run:"
echo ""
echo "   ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$SERVER_IP"
echo ""
echo "Or if you have the key in a file:"
echo "   ssh-copy-id -i /path/to/your/key.pub root@$SERVER_IP"
echo ""
echo "After setting up SSH keys, run the deployment:"
echo "   ./deploy-with-ssh.sh"
echo ""
echo "✅ SSH key setup guide complete!"