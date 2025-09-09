const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all client types
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute('SELECT * FROM Client_Type', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await conn.close();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET by CLIENT_TYPE_ID
router.get('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Client_Type WHERE CLIENT_TYPE_ID = :id',
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post('/', async (req, res) => {
    try {
        const { CLIENT_TYPE, TYPE_NAME, DISCOUNT_RATE, REMARKS } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Client_Type (CLIENT_TYPE, TYPE_NAME, DISCOUNT_RATE, REMARKS)
             VALUES (:CLIENT_TYPE, :TYPE_NAME, :DISCOUNT_RATE, :REMARKS)`,
            { CLIENT_TYPE, TYPE_NAME, DISCOUNT_RATE, REMARKS },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Client type added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    try {
        const { TYPE_NAME, DISCOUNT_RATE, REMARKS } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `UPDATE Client_Type
             SET TYPE_NAME = :TYPE_NAME, DISCOUNT_RATE = :DISCOUNT_RATE, REMARKS = :REMARKS
             WHERE CLIENT_TYPE_ID = :id`,
            { TYPE_NAME, DISCOUNT_RATE, REMARKS, id: req.params.id },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Client type updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM Client_Type WHERE CLIENT_TYPE_ID = :id',
            [req.params.id],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Client type deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
