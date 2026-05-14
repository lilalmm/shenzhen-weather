#!/bin/bash
# deploy.sh - 一键推送到 GitHub 并触发部署
# 用法：./deploy.sh <github_repo_url>
# 示例：./deploy.sh https://github.com/yourname/shenzhen-weather.git

set -e

REPO_URL="${1}"

if [ -z "$REPO_URL" ]; then
  echo "❌ 请提供 GitHub 仓库地址"
  echo "用法: ./deploy.sh https://github.com/yourname/shenzhen-weather.git"
  exit 1
fi

echo "🚀 开始部署深圳天气 AI 工具..."
echo "📦 目标仓库: $REPO_URL"

# 添加远程仓库
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# 推送代码
git push -u origin main

echo ""
echo "✅ 代码已推送到 GitHub！"
echo ""
echo "📋 接下来的步骤："
echo "  方式一 - Render (推荐)："
echo "    1. 访问 https://render.com"
echo "    2. New + → Web Service → 连接 GitHub 仓库"
echo "    3. 自动识别 render.yaml，点击 Deploy"
echo "    4. 配置环境变量（ALIPAY_* 相关）"
echo ""
echo "  方式二 - Railway："
echo "    1. 访问 https://railway.app"
echo "    2. New Project → Deploy from GitHub"
echo "    3. 选择仓库，自动部署"
echo ""
echo "  部署完成后，你将获得一个公网地址，例如："
echo "    https://shenzhen-weather.onrender.com"
