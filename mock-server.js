const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock JWT token
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlN5c3RlbSBBZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Auth endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'System' && password === 'admin') {
    res.json({
      access_token: MOCK_TOKEN,
      user: {
        id: 1,
        username: 'System',
        role: 'ADMIN'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Dashboard data
app.get('/dashboard', (req, res) => {
  res.json({
    totalEmployees: 150,
    attendanceToday: 145,
    absentToday: 5,
    pendingApprovals: 12
  });
});

// Employees
app.get('/employees', (req, res) => {
  res.json({
    data: [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', department: 'IT' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', department: 'HR' },
      { id: 3, firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', department: 'Finance' }
    ]
  });
});

// Attendance
app.get('/attendance', (req, res) => {
  res.json({
    data: [
      { id: 1, employeeId: 1, date: '2026-07-16', clockIn: '08:00', clockOut: '17:00', status: 'Present' },
      { id: 2, employeeId: 2, date: '2026-07-16', clockIn: '08:15', clockOut: '17:15', status: 'Present' }
    ]
  });
});

// Payroll
app.get('/payroll', (req, res) => {
  res.json({
    data: [
      { id: 1, employeeId: 1, grossAmount: 50000, deductions: 5000, netAmount: 45000 },
      { id: 2, employeeId: 2, grossAmount: 48000, deductions: 4800, netAmount: 43200 }
    ]
  });
});

// Rules
app.get('/rules', (req, res) => {
  res.json({
    data: [
      { id: 1, name: 'Overtime Rule', type: 'OT', value: 1.5 },
      { id: 2, name: 'Meal Allowance', type: 'MEAL', value: 200 }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Mock Backend API running on http://localhost:${PORT}`);
});
