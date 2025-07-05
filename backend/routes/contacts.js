const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// GET all contacts for the authenticated user
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id }).sort({ dateAdded: -1 });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST new contact for the authenticated user
router.post('/', async (req, res) => {
  try {
    const contactData = { ...req.body, userId: req.user.id };
    const contact = new Contact(contactData);
    const savedContact = await contact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ error: 'Failed to create contact', details: error.message });
  }
});

// PUT update contact for the authenticated user
router.put('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(400).json({ error: 'Failed to update contact' });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;