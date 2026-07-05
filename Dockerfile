# Gunakan image Node.js yang stabil
FROM node:18-alpine

# Tentukan direktori kerja di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies (gunakan npm ci agar lebih cepat dan aman di deployment)
RUN npm ci --omit=dev

# Salin seluruh source code ke dalam container
COPY . .

# Set environment variable agar Node berjalan di mode produksi
ENV NODE_ENV=production

# Ekspos port yang digunakan aplikasi Express
EXPOSE 5000

# Jalankan perintah untuk memulai server
CMD ["npm", "start"]
