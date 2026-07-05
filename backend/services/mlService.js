const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const csv = require("csvtojson");

const mlModel = require("../models/mlModel");

const ML_ROOT = path.join(__dirname, "../../ml");
const UPLOADS_DIR = path.join(ML_ROOT, "data/uploads");

const METRICS_PATH = path.join(ML_ROOT, "outputs/metrics/model_metrics.csv");
const FINAL_PREDICTIONS_PATH = path.join(ML_ROOT, "outputs/predictions/final_predictions.csv");
const REGRESSION_PREDICTION_PATH = path.join(ML_ROOT, "outputs/predictions/regression_prediction.csv");
const FORECAST_PATH = path.join(ML_ROOT, "outputs/predictions/arima_forecast.csv");
const PROCESSED_DATA_PATH = path.join(ML_ROOT, "data/processed/regional_poverty_processed.csv");

let trainingStatus = {
    isRunning: false,
    step: "Idle",
    progress: 0,
    status: "idle",
};

function runPythonScript(scriptPath, args = [], onProgress = null) {
    return new Promise((resolve, reject) => {
        const pythonArgs =
            scriptPath === "-m"
                ? ["-m", ...args]
                : [scriptPath, ...args];

        const process = spawn("python", pythonArgs, {
            cwd: ML_ROOT,
            shell: false,
        });

        let output = "";
        let error = "";

        process.stdout.on("data", (data) => {
            const text = data.toString();
            output += text;

            if (onProgress) {
                onProgress(text);
            }
        });

        process.stderr.on("data", (data) => {
            error += data.toString();
        });

        process.on("close", (code) => {
            if (code !== 0) {
                reject({
                    message: "Python script failed",
                    error,
                });
            } else {
                resolve(output);
            }
        });
    });
}

function updateTrainingProgress(text) {
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        if (!line.startsWith("[PROGRESS]")) continue;

        const cleanLine = line.replace("[PROGRESS]", "").trim();
        const [percent, step] = cleanLine.split("|");

        trainingStatus = {
            isRunning: true,
            step: step || "Processing...",
            progress: Number(percent) || 0,
            status: "running",
        };
    }
}

async function readCsvIfExists(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return await csv().fromFile(filePath);
}

function getNumericValue(value) {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
}

function getBestModelFromMetrics(metrics) {
    if (!metrics.length) return null;

    const sorted = [...metrics].sort((a, b) => {
        const maeA = getNumericValue(a.test_mae) ?? Number.MAX_VALUE;
        const maeB = getNumericValue(b.test_mae) ?? Number.MAX_VALUE;

        if (maeA !== maeB) return maeA - maeB;

        const rmseA = getNumericValue(a.test_rmse) ?? Number.MAX_VALUE;
        const rmseB = getNumericValue(b.test_rmse) ?? Number.MAX_VALUE;

        return rmseA - rmseB;
    });

    return sorted[0];
}

function addBestModelFlag(metrics) {
    const best = getBestModelFromMetrics(metrics);

    if (!best) return metrics;

    return metrics.map((item) => ({
        ...item,
        is_best: item.model === best.model,
    }));
}

function getYearRangeFromRows(rows, yearKey = "year") {
    const years = rows
        .map((row) => Number(row[yearKey]))
        .filter((year) => !Number.isNaN(year));

    if (!years.length) {
        return {
            yearStart: null,
            yearEnd: null,
        };
    }

    return {
        yearStart: Math.min(...years),
        yearEnd: Math.max(...years),
    };
}

function sanitizeFileName(fileName) {
    return fileName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");
}

async function validateCsvFile(file) {
    if (!file) {
        throw new Error("No dataset file uploaded.");
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (fileExtension !== ".csv") {
        throw new Error("Only CSV files are allowed.");
    }
}

async function saveUploadedFile(file) {
    fs.mkdirSync(UPLOADS_DIR, {
        recursive: true,
    });

    const timestamp = Date.now();
    const cleanName = sanitizeFileName(file.originalname);
    const finalFileName = `${timestamp}_${cleanName}`;
    const finalPath = path.join(UPLOADS_DIR, finalFileName);

    fs.copyFileSync(file.path, finalPath);
    fs.unlinkSync(file.path);

    return finalPath;
}

async function uploadDataset(file, userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    await validateCsvFile(file);

    const savedPath = await saveUploadedFile(file);
    const uploadedRows = await readCsvIfExists(savedPath);
    const yearRange = getYearRangeFromRows(uploadedRows);

    const uploadId = await mlModel.createUpload({
        fileName: file.originalname,
        filePath: savedPath,
        uploadedBy: userId,
        rowsCount: uploadedRows.length,
        yearStart: yearRange.yearStart,
        yearEnd: yearRange.yearEnd,
        status: "uploaded",
    });

    await mlModel.createActivityLog(
        userId,
        "UPLOAD_DATASET",
        `Uploaded dataset ${file.originalname}`
    );

    return {
        uploadId,
        originalName: file.originalname,
        savedAs: savedPath,
        rowsCount: uploadedRows.length,
        yearStart: yearRange.yearStart,
        yearEnd: yearRange.yearEnd,
        message: "Dataset uploaded successfully.",
    };
}

async function getDatasets() {
    return await mlModel.getDatasets();
}

async function mergeDatasets(uploadIds, userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
        throw new Error("Please select at least one dataset to merge.");
    }

    const datasets = await mlModel.getDatasetsByIds(uploadIds);

    if (!datasets.length) {
        throw new Error("No valid datasets found for merging.");
    }

    const filePaths = datasets.map((dataset) => dataset.file_path);

    const missingFiles = filePaths.filter(
        (filePath) => !fs.existsSync(filePath)
    );

    if (missingFiles.length > 0) {
        throw new Error(
            `Some dataset files are missing: ${missingFiles.join(", ")}`
        );
    }

    const output = await runPythonScript("-m", [
        "src.data_manager",
        JSON.stringify(filePaths),
    ]);

    await mlModel.markDatasetsAsMerged(uploadIds);

    for (const dataset of datasets) {
        try {
            if (fs.existsSync(dataset.file_path)) {
                fs.unlinkSync(dataset.file_path);
            }
        } catch (err) {
            console.error(`Failed to delete ${dataset.file_path}:`, err.message);
        }
    }

    await mlModel.markFilesAsDeleted(uploadIds);

    await mlModel.createActivityLog(
        userId,
        "MERGE_DATASETS",
        `Merged selected datasets into master dataset. Upload IDs: ${uploadIds.join(", ")}`
    );

    return {
        message: "Selected datasets merged into master dataset.",
        mergedUploadIds: uploadIds,
        filesDeleted: true,
        output,
    };
}

async function archiveDataset(id, reason, userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    const dataset = await mlModel.getDatasetById(id);

    if (!dataset) {
        throw new Error("Dataset not found.");
    }

    await mlModel.archiveDataset({
        uploadId: id,
        archivedBy: userId,
        fileName: dataset.file_name,
        filePath: dataset.file_path,
        reason,
    });

    await mlModel.createActivityLog(
        userId,
        "ARCHIVE_DATASET",
        `Archived dataset ${dataset.file_name}`
    );

    return {
        id,
        message: "Dataset archived successfully.",
    };
}

async function preprocessData(userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    await runPythonScript("src/preprocessing.py");
    const output = await runPythonScript("src/feature_engineering.py");

    await mlModel.createActivityLog(
        userId,
        "PREPROCESS_DATA",
        "Generated processed and feature-engineered datasets from master dataset."
    );

    return output;
}

async function trainModels(userId) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    const trainingId = await mlModel.createTraining({
        uploadId: null,
        trainedBy: userId,
        status: "running",
    });

    try {
        trainingStatus = {
            isRunning: true,
            step: "Starting training pipeline",
            progress: 5,
            status: "running",
        };

        const output = await runPythonScript("main.py", [], updateTrainingProgress);

        trainingStatus = {
            isRunning: false,
            step: "Training completed",
            progress: 100,
            status: "completed",
        };

        const metrics = addBestModelFlag(await readCsvIfExists(METRICS_PATH));
        const finalPredictions = await readCsvIfExists(FINAL_PREDICTIONS_PATH);
        const regressionPredictions = await readCsvIfExists(REGRESSION_PREDICTION_PATH);
        const forecasts = await readCsvIfExists(FORECAST_PATH);
        const processedRows = await readCsvIfExists(PROCESSED_DATA_PATH);

        const bestMetric = getBestModelFromMetrics(metrics);
        const trainYearRange = getYearRangeFromRows(processedRows);

        const predictionYears = regressionPredictions
            .map((row) => Number(row.prediction_year))
            .filter((year) => !Number.isNaN(year));

        const forecastYears = forecasts
            .map((row) => Number(row.forecast_year))
            .filter((year) => !Number.isNaN(year));

        await mlModel.insertModelMetrics(trainingId, metrics);
        await mlModel.insertPredictions(trainingId, regressionPredictions);
        await mlModel.insertForecasts(trainingId, forecasts);

        await mlModel.updateTrainingCompleted({
            trainingId,
            bestModel: bestMetric ? bestMetric.model : null,
            trainYearStart: trainYearRange.yearStart,
            trainYearEnd: trainYearRange.yearEnd,
            predictionYear: predictionYears.length
                ? Math.max(...predictionYears)
                : null,
            forecastStartYear: forecastYears.length
                ? Math.min(...forecastYears)
                : null,
            forecastEndYear: forecastYears.length
                ? Math.max(...forecastYears)
                : null,
        });

        await mlModel.createActivityLog(
            userId,
            "TRAIN_MODELS",
            `Training completed. Best model: ${bestMetric ? bestMetric.model : "N/A"}`
        );

        return {
            trainingId,
            output,
            bestModel: bestMetric ? bestMetric.model : null,
            metrics,
            predictions: finalPredictions,
            forecasts,
        };
    } catch (error) {
        trainingStatus = {
            isRunning: false,
            step: "Training failed",
            progress: 0,
            status: "failed",
        };

        await mlModel.updateTrainingFailed(
            trainingId,
            error.error || error.message
        );

        await mlModel.createActivityLog(
            userId,
            "TRAIN_FAILED",
            error.error || error.message
        );

        throw error;
    }
}

async function getRegionalData() {
    const regionalDataPath = path.join(
        ML_ROOT,
        "data/processed/regional_poverty_processed.csv"
    );

    if (!fs.existsSync(regionalDataPath)) {
        throw new Error("Regional processed data not found. Run preprocessing first.");
    }

    return await csv().fromFile(regionalDataPath);
}

async function getMetrics() {
    return await mlModel.getLatestMetrics();
}

async function getPredictions() {
    return await mlModel.getLatestPredictions();
}

async function getForecast() {
    return await mlModel.getLatestForecasts();
}

async function getTrainingStatus() {
    return trainingStatus;
}

async function getStatus() {
    const latestUpload = await mlModel.getLatestUpload();
    const latestTraining = await mlModel.getLatestTraining();
    const latestMetrics = await mlModel.getLatestMetrics();

    return {
        latestUpload,
        latestTraining,
        latestMetrics,
    };
}

module.exports = {
    getRegionalData,
    uploadDataset,
    getDatasets,
    mergeDatasets,
    archiveDataset,
    preprocessData,
    trainModels,
    getMetrics,
    getPredictions,
    getForecast,
    getTrainingStatus,
    getStatus,
};