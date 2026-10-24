#!/bin/bash
# Run this locally on your Mac to add the ryu-deploy SSH key to the server
ssh -i ~/.ssh/tenenbaum-prod -o StrictHostKeyChecking=no root@51.15.79.169 \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" \
  < ~/.ssh/ryu-deploy.pub
