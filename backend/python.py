from flask import Flask, jsonify

from flask_cors import CORS
app = Flask(__name__)
CORS(app, supports_credentials=True)

orders = [
    {"id": 1, "name": "Book", "totalAmount": 2000.00, "status": "delivered"},
    {"id": 2, "name": "Pen", "totalAmount": 55497.11, "status": "pending"},
    {"id": 3, "name": "Pencil", "totalAmount": 1000.00, "status": "delivered"},
    {"id": 4, "name": "Eraser", "totalAmount": 500.00, "status": "pending"},
]

users = [
    {"id": 1, "name": "Ken", "email": "123@qq.com"},
    {"id": 2, "name": "Ben", "email": "pen@example.com"},
    {"id": 3, "name": "Shell", "email": "pencil@example.com"},
    {"id": 4, "name": "Lili", "email": "eraser@example.com"},
    {"id": 5, "name": "Tom", "email": "tom@example.com"},
    {"id": 6, "name": "Jerry", "email": "jerry@example.com"}
]


@app.route('/api/orders')
def get_orders():
    return jsonify(orders)

@app.route('/api/users')
def get_users():
    return jsonify(users)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)