"""
Simple script to test that Flask is working correctly.
"""
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Flask is working correctly!"

if __name__ == '__main__':
    print("Flask installation test:")
    print("Flask version:", Flask.__version__)
    print("Flask import successful. Try running with: python -m flask --app test_flask run") 