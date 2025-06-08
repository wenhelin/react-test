# My React Ant Fullstack App

This project is a fullstack application built with React.js for the frontend and Express.js for the backend. It utilizes Ant Design for UI components and provides routes to access an order list and a user list.

## Project Structure

```
my-react-ant-fullstack-app
├── backend
│   ├── src
│   │   ├── controllers
│   │   │   ├── orderController.js
│   │   │   └── userController.js
│   │   ├── routes
│   │   │   ├── orderRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── README.md
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   ├── AntdButton.jsx
│   │   │   ├── OrderList.jsx
│   │   │   └── UserList.jsx
│   │   ├── pages
│   │   │   ├── OrdersPage.jsx
│   │   │   └── UsersPage.jsx
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── api
│   │       ├── orders.js
│   │       └── users.js
│   ├── package.json
│   └── README.md
└── README.md
```

## Instructions to Initialize and Install Necessary Packages

### Backend Setup

1. Navigate to the `backend` directory:
   ```
   cd backend
   ```

2. Run the following command to create a `package.json` file:
   ```
   npm init -y
   ```

3. Install necessary packages:
   ```
   npm install express cors body-parser
   ```

4. Create the directory structure and files as outlined above.

5. Implement the code in each file as described in the project structure.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

2. Initialize a new React application:
   ```
   npx create-react-app .
   ```

3. Install necessary packages:
   ```
   npm install antd axios react-router-dom
   ```

4. Create the directory structure and files as outlined above.

5. Implement the code in each file as described in the project structure.

### Running the Application

1. Start the backend server:
   - Navigate to the `backend` directory and run:
     ```
     node src/server.js
     ```

2. Start the frontend application:
   - Navigate to the `frontend` directory and run:
     ```
     npm start
     ```
3. Link
   http://localhost:4441/#/orders

   http://localhost:4441/#/users

This setup will allow you to access the order list and user list through the defined routes in your React application.