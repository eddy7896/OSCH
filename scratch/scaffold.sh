#!/bin/bash

# Ensure apps directory exists
mkdir -p apps

# Create Next.js apps
echo "Creating Next.js apps..."
npx -y create-next-app@latest apps/saas-admin --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --skip-install
npx -y create-next-app@latest apps/web-admin --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --skip-install
npx -y create-next-app@latest apps/landing-page --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --skip-install

# Create NestJS API
echo "Creating NestJS API Gateway..."
npx -y @nestjs/cli new apps/api-gateway --skip-git --skip-install --package-manager npm

# Create Flutter apps
echo "Creating Flutter apps..."
cd apps
flutter create --empty mobile-teacher
flutter create --empty mobile-parent
flutter create --empty mobile-driver
flutter create --empty mobile-staff
cd ..

echo "Scaffolding complete!"
