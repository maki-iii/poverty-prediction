const mlService = require("../services/mlService");

function getUserId(req) {
    return req.user?.id || req.body.user_id || req.query.user_id;
}

async function upload(req, res) {
    try {
        const userId = getUserId(req);
        const result = await mlService.uploadDataset(req.file, userId);

        res.json({
            success: true,
            message: "Dataset uploaded successfully.",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

async function datasets(req, res) {
    try {
        const data = await mlService.getDatasets();

        res.json({
            success: true,
            datasets: data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

async function mergeDatasets(req, res) {
    try {
        const userId = getUserId(req);

        console.log("========== MERGE REQUEST ==========");
        console.log("BODY:", req.body);
        console.log("upload_ids:", req.body.upload_ids);
        console.log("USER ID:", userId);
        console.log("===================================");

        const result = await mlService.mergeDatasets(
            req.body.upload_ids,
            userId
        );

        res.json({
            success: true,
            message: "Selected datasets merged into master dataset.",
            data: result,
        });
    } catch (error) {
        console.error("MERGE ERROR:", error);

        res.status(400).json({
            success: false,
            message: error.message,
            error: error.error || error,
        });
    }
}

async function archiveDataset(req, res) {
    try {
        const userId = getUserId(req);

        const result = await mlService.archiveDataset(
            req.params.id,
            req.body.reason || null,
            userId
        );

        res.json({
            success: true,
            message: "Dataset archived successfully.",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

async function preprocess(req, res) {
    try {
        const userId = getUserId(req);
        const result = await mlService.preprocessData(userId);

        res.json({
            success: true,
            message: "Preprocessing completed.",
            output: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            error: error.error || error,
        });
    }
}

async function train(req, res) {
    try {
        const userId = getUserId(req);
        const result = await mlService.trainModels(userId);

        res.json({
            success: true,
            message: "Training completed. Best model selected and prediction generated.",
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            error: error.error || error,
        });
    }
}

async function metrics(req, res) {
    try {
        const data = await mlService.getMetrics();

        res.json({
            success: true,
            metrics: data,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}

async function predictions(req, res) {
    try {
        const data = await mlService.getPredictions();

        res.json({
            success: true,
            predictions: data,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}

async function forecast(req, res) {
    try {
        const data = await mlService.getForecast();

        res.json({
            success: true,
            forecast: data,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}

async function trainingStatus(req, res) {
    try {
        const data = await mlService.getTrainingStatus();

        res.json({
            success: true,
            trainingStatus: data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

async function regionalData(req, res) {
    try {
        const data = await mlService.getRegionalData();

        res.json({
            success: true,
            regionalData: data,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}

async function status(req, res) {
    try {
        const data = await mlService.getStatus();

        res.json({
            success: true,
            status: data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = {
    regionalData,
    upload,
    datasets,
    mergeDatasets,
    archiveDataset,
    preprocess,
    train,
    metrics,
    predictions,
    forecast,
    trainingStatus,
    status,
};