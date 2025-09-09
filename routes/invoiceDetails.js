const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all invoice details
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute('SELECT * FROM Invoice_Details', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await conn.close();
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET invoice detail by InvoiceNo and Product_no
router.get('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Invoice_Details WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo',
            [req.params.invoiceNo, req.params.productNo],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE invoice detail
router.post('/', async (req, res) => {
    try {
        const { InvoiceNo, Product_no, Qty, Price } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Invoice_Details (InvoiceNo, Product_no, Qty, Price)
             VALUES (:InvoiceNo, :Product_no, :Qty, :Price)`,
            { InvoiceNo, Product_no, Qty, Price },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice detail added successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE invoice detail
router.put('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const { Qty, Price } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `UPDATE Invoice_Details
             SET Qty = :Qty, Price = :Price
             WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo`,
            { Qty, Price, invoiceNo: req.params.invoiceNo, productNo: req.params.productNo },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice detail updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE invoice detail
router.delete('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM Invoice_Details WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo',
            [req.params.invoiceNo, req.params.productNo],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice detail deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
