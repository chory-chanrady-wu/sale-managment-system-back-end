const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all invoices
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute('SELECT * FROM Invoices', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await conn.close();
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET invoice by InvoiceNo
router.get('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Invoices WHERE InvoiceNo = :id',
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE invoice
router.post('/', async (req, res) => {
    try {
        const { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Invoices (Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo)
             VALUES (TO_DATE(:Invoice_date, 'YYYY-MM-DD'), :Client_no, :EmployeeID, :Invoice_status, :InvoiceMemo)`,
            { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice added successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE invoice
router.put('/:id', async (req, res) => {
    try {
        const { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `UPDATE Invoices
             SET Invoice_date = TO_DATE(:Invoice_date, 'YYYY-MM-DD'), Client_no = :Client_no, EmployeeID = :EmployeeID,
                 Invoice_status = :Invoice_status, InvoiceMemo = :InvoiceMemo
             WHERE InvoiceNo = :id`,
            { Invoice_date, Client_no, EmployeeID, Invoice_status, InvoiceMemo, id: req.params.id },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM Invoices WHERE InvoiceNo = :id',
            [req.params.id],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
