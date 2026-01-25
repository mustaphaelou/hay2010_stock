# Hay2010 Stock Management

Hay2010 is a premium, high-fidelity stock management system designed for visual excellence and efficiency. Built with Next.js, Shadcn UI, and Supabase, it provides a seamless experience for tracking stock levels, movements, and suppliers.

![Hay2010 Dashboard Mockup](public/dashboard-mockup.png)

## 🚀 Features

- **Dynamic Dashboard**: Real-time insights into stock levels and movements.
- **Supplier Management**: Detailed tracking and overview of all suppliers.
- **Stock Movement Logs**: History of all stock transactions with interactive charts.
- **Modern UI**: Dark mode aesthetic with glassmorphism and smooth micro-animations.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/)
- **State Management**: [React Hooks](https://react.dev/reference/react)

## 📦 Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🐳 Docker Deployment

You can run the application using Docker for a consistent production environment.

### Using Docker Compose

1. Build and start the container:
   ```bash
   docker-compose up --build -d
   ```

2. Access the application at [http://localhost:3000](http://localhost:3000).

### Using the Dockerfile directly

1. Build the image:
   ```bash
   docker build -t hay2010_stock .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key \
     hay2010_stock
   ```

## 🚚 GitHub Integration

This repository is configured with a GitHub Action that automatically builds and pushes the Docker image to the **GitHub Container Registry (GHCR)** on every push to the `main` branch.

You can pull the latest image using:
```bash
docker pull ghcr.io/mustaphaelou/hay2010_stock:main
```

## 🛠️ Configuration

## 📄 License

This project is licensed under the MIT License.
