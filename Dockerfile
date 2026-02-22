# Stage 1: Build
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
# 显式安装 Linux 环境下的 Rollup 二进制依赖，解决从 Windows 提交代码后的平台不匹配问题
RUN npm install @rollup/rollup-linux-x64-gnu
COPY . .
RUN npm run build

# Stage 2: Serve
FROM m.daocloud.io/docker.io/library/nginx:stable-alpine
# 拷贝编译后的静态文件
COPY --from=build-stage /app/dist /usr/share/nginx/html
# 拷贝自定义的 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]