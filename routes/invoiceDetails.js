const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all invoice details
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Invoice_Details',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET invoice detail by InvoiceNo and Product_no
router.get('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Invoice_Details WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo',
            { invoiceNo: req.params.invoiceNo, productNo: req.params.productNo },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Invoice detail not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE single invoice detail
router.post('/', async (req, res) => {
    try {
        const { InvoiceNo, Product_no, Qty, Price } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Invoice_Details (InvoiceNo, Product_no, Qty, Price)
             VALUES (:InvoiceNo, :Product_no, :Qty, :Price)`,
            {
                InvoiceNo: Number(InvoiceNo),
                Product_no,
                Qty: Number(Qty),
                Price: Number(Price)
            },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Invoice detail added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE multiple invoice details at once
router.post('/bulk', async (req, res) => {
    try {
        const { details } = req.body; // expect an array of {InvoiceNo, Product_no, Qty, Price}
        if (!Array.isArray(details) || details.length === 0) {
            return res.status(400).json({ error: "Details array is required" });
        }

        const conn = await getConnection();
        for (const d of details) {
            await conn.execute(
                `INSERT INTO Invoice_Details (InvoiceNo, Product_no, Qty, Price)
                 VALUES (:InvoiceNo, :Product_no, :Qty, :Price)`,
                {
                    InvoiceNo: Number(d.InvoiceNo),
                    Product_no: d.Product_no,
                    Qty: Number(d.Qty),
                    Price: Number(d.Price)
                }
            );
        }
        await conn.commit();
        await conn.close();
        res.json({ message: 'All invoice details added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE invoice detail
router.put('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const { Qty, Price } = req.body;
        const conn = await getConnection();
        const result = await conn.execute(
            `UPDATE Invoice_Details
             SET Qty = :Qty, Price = :Price
             WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo`,
            {
                Qty: Number(Qty),
                Price: Number(Price),
                invoiceNo: req.params.invoiceNo,
                productNo: req.params.productNo
            },
            { autoCommit: true }
        );
        await conn.close();

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: "Invoice detail not found" });
        }

        res.json({ message: 'Invoice detail updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE invoice detail
router.delete('/:invoiceNo/:productNo', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'DELETE FROM Invoice_Details WHERE InvoiceNo = :invoiceNo AND Product_no = :productNo',
            { invoiceNo: req.params.invoiceNo, productNo: req.params.productNo },
            { autoCommit: true }
        );
        await conn.close();

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: "Invoice detail not found" });
        }

        res.json({ message: 'Invoice detail deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
