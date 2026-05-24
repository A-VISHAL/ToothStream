# Perio Voice AI

This project is a real-time dental voice charting application using a Python FastAPI backend and a React frontend.

## Project Structure

```
perio-voice-ai/
├── backend/
│   ├── main.py
│   ├── .env
│   └── requirements.txt
├── frontend/
└── README.md
```

## Setup and Running

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    -   On Windows:
        ```bash
        venv\Scripts\activate
        ```
    -   On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```

4.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the FastAPI server:**
    ```bash
    uvicorn main:app --reload
    ```
    The backend will be running at `http://localhost:8000`.

### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the dependencies:**
    ```bash
    npm install
    ```

3.  **Run the React development server:**
    ```bash
    npm start
    ```
    The frontend will be running at `http://localhost:3000`.

## Usage

1.  Open the application in your browser at `http://localhost:3000`.
2.  Click the "Start Recording" button to begin streaming your voice.
3.  The live transcript will appear in the transcript panel.
4.  Click the "Stop Recording" button to stop.
