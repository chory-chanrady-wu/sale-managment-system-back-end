const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all jobs
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute('SELECT * FROM Jobs', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await conn.close();
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET job by JOB_ID
router.get('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Jobs WHERE JOB_ID = :id',
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE job
router.post('/', async (req, res) => {
    try {
        const { JOB_ID, Job_Title, Department, Min_Salary, Max_Salary } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Jobs (Job_Title, Department, Min_Salary, Max_Salary)
             VALUES (:Job_Title, :Department, :Min_Salary, :Max_Salary)`,
            { Job_Title, Department, Min_Salary, Max_Salary },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Job added successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE job
router.put('/:id', async (req, res) => {
    try {
        const { Job_Title, Department, Min_Salary, Max_Salary } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `UPDATE Jobs
             SET Job_Title = :Job_Title, Department = :Department,
                 Min_Salary = :Min_Salary, Max_Salary = :Max_Salary
             WHERE JOB_ID = :id`,
            { Job_Title, Department, Min_Salary, Max_Salary, id: req.params.id },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Job updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE job
router.delete('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM Jobs WHERE JOB_ID = :id',
            [req.params.id],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Job deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
