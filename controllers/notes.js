const notesModel = require("../models/note")
const {validationResult} = require('express-validator')

const notesListing = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const notesData = await notesModel.find({customer_id:_id})
        return res.status(200).json({message:"Successfully fetched notes data",notesData, error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addNote = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const { title, note} = req.body
        await notesModel.create({customer_id:_id,title:title,note:note})
        return res.status(200).json({message:"Successfully saved note", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const editNote = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id, title, note} = req.body
        await notesModel.findByIdAndUpdate(id,{title:title,note:note})
        return res.status(200).json({message:"Successfully updated note", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const cloneNote = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const _id = req.user;
        const {title, note} = req.body;

        await notesModel.create({customer_id:_id, title:title + " - Copy", note:note})
        return res.status(200).json({message:"Successfully cloned note", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteNote = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id } = req.query
        await notesModel.findByIdAndDelete(id)
        return res.status(200).json({message:"Successfully deleted note", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    notesListing,
    addNote,
    editNote,
    cloneNote,
    deleteNote
};