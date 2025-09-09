const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all products
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute('SELECT * FROM Products', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await conn.close();
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET product by Product_no
router.get('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Products WHERE Product_no = :id',
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE product
router.post('/', async (req, res) => {
    try {
        const { Product_no, ProductName, ProductType, Profit_percent, Unit_measure, Reorder_level, Cost_Price, Sell_price, QTY_ON_HAND, Photo } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `INSERT INTO Products (Product_no, ProductName, ProductType, Profit_percent, Unit_measure, Reorder_level, Cost_Price, Sell_price, QTY_ON_HAND, Photo)
             VALUES (:Product_no, :ProductName, :ProductType, :Profit_percent, :Unit_measure, :Reorder_level, :Cost_Price, :Sell_price, :QTY_ON_HAND, :Photo)`,
            { Product_no, ProductName, ProductType, Profit_percent, Unit_measure, Reorder_level, Cost_Price, Sell_price, QTY_ON_HAND, Photo },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Product added successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE product
router.put('/:id', async (req, res) => {
    try {
        const { ProductName, ProductType, Profit_percent, Unit_measure, Reorder_level, Cost_Price, Sell_price, QTY_ON_HAND, Photo } = req.body;
        const conn = await getConnection();
        await conn.execute(
            `UPDATE Products
             SET ProductName = :ProductName, ProductType = :ProductType, Profit_percent = :Profit_percent,
                 Unit_measure = :Unit_measure, Reorder_level = :Reorder_level, Cost_Price = :Cost_Price,
                 Sell_price = :Sell_price, QTY_ON_HAND = :QTY_ON_HAND, Photo = :Photo
             WHERE Product_no = :id`,
            { ProductName, ProductType, Profit_percent, Unit_measure, Reorder_level, Cost_Price, Sell_price, QTY_ON_HAND, Photo, id: req.params.id },
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Product updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM Products WHERE Product_no = :id',
            [req.params.id],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Product deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
// DELETE product