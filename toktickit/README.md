# TokTickIT 

## Setup Instructions

1. **Install Dependencies**
   Navigate to the `client` and `server` directories and install dependencies:
   ```bash
   cd client
   npm install

   cd ../server
   npm install
   ```

2. **Environment Variables**
   In the `server` directory, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Update the `DATABASE_URL` in `.env` with your PostgreSQL connection string.

3. **Database Setup**
   Ensure your PostgreSQL server is running. Then, push the schema to your database:
   ```bash
   cd server
   npx prisma db push
   ```

4. **Running the Application**
   Start the frontend (Vite) and backend (Express) development servers:
   
   **Frontend:**
   ```bash
   cd client
   npm run dev
   ```

   **Backend:**
   ```bash
   cd server
   npm run dev
   ```

5. **Testing**
   Both client and server use Vitest. To run tests:
   ```bash
   npm run test
   ```