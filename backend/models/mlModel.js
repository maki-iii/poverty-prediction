const db = require("../configs/db");

async function createUpload({
    fileName,
    filePath,
    uploadedBy,
    rowsCount = 0,
    yearStart = null,
    yearEnd = null,
    status = "uploaded",
}) {
    const [result] = await db.execute(
        `
        INSERT INTO ml_uploads 
        (file_name, file_path, uploaded_by, rows_count, year_start, year_end, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [fileName, filePath, uploadedBy, rowsCount, yearStart, yearEnd, status]
    );

    return result.insertId;
}

async function getDatasets() {
    const [rows] = await db.execute(
        `
        SELECT 
            u.*,
            users.username AS uploaded_by_name
        FROM ml_uploads u
        LEFT JOIN users ON u.uploaded_by = users.id
        WHERE u.is_archived = 0
        ORDER BY u.created_at DESC
        `
    );

    return rows;
}

async function getDatasetById(id) {
    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_uploads
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function updateDatasetName(id, fileName) {
    await db.execute(
        `
        UPDATE ml_uploads
        SET file_name = ?
        WHERE id = ?
        `,
        [fileName, id]
    );
}

async function updateDatasetFile({
    id,
    fileName,
    filePath,
    rowsCount,
    yearStart,
    yearEnd,
}) {
    await db.execute(
        `
        UPDATE ml_uploads
        SET 
            file_name = ?,
            file_path = ?,
            rows_count = ?,
            year_start = ?,
            year_end = ?,
            status = 'uploaded'
        WHERE id = ?
        `,
        [fileName, filePath, rowsCount, yearStart, yearEnd, id]
    );
}

async function archiveDataset({
    uploadId,
    archivedBy,
    fileName,
    filePath,
    reason = null,
}) {
    await db.execute(
        `
        INSERT INTO ml_archived_datasets
        (upload_id, archived_by, file_name, file_path, reason)
        VALUES (?, ?, ?, ?, ?)
        `,
        [uploadId, archivedBy, fileName, filePath, reason]
    );

    await db.execute(
        `
        UPDATE ml_uploads
        SET is_archived = 1
        WHERE id = ?
        `,
        [uploadId]
    );
}

async function getLatestUpload() {
    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_uploads
        WHERE is_archived = 0
        ORDER BY created_at DESC
        LIMIT 1
        `
    );

    return rows[0] || null;
}

async function updateUploadStatus(uploadId, status) {
    await db.execute(
        `
        UPDATE ml_uploads
        SET status = ?
        WHERE id = ?
        `,
        [status, uploadId]
    );
}

async function createTraining({
    uploadId = null,
    trainedBy,
    status = "running",
}) {
    const [result] = await db.execute(
        `
        INSERT INTO ml_trainings
        (upload_id, trained_by, status)
        VALUES (?, ?, ?)
        `,
        [uploadId, trainedBy, status]
    );

    return result.insertId;
}

async function updateTrainingCompleted({
    trainingId,
    bestModel,
    trainYearStart = null,
    trainYearEnd = null,
    predictionYear = null,
    forecastStartYear = null,
    forecastEndYear = null,
}) {
    await db.execute(
        `
        UPDATE ml_trainings
        SET 
            status = 'completed',
            best_model = ?,
            train_year_start = ?,
            train_year_end = ?,
            prediction_year = ?,
            forecast_start_year = ?,
            forecast_end_year = ?
        WHERE id = ?
        `,
        [
            bestModel,
            trainYearStart,
            trainYearEnd,
            predictionYear,
            forecastStartYear,
            forecastEndYear,
            trainingId,
        ]
    );
}

async function updateTrainingFailed(trainingId, errorMessage) {
    await db.execute(
        `
        UPDATE ml_trainings
        SET status = 'failed',
            error_message = ?
        WHERE id = ?
        `,
        [errorMessage, trainingId]
    );
}

async function insertModelMetrics(trainingId, metrics) {
    for (const item of metrics) {
        await db.execute(
            `
            INSERT INTO ml_model_metrics
            (
                training_id,
                model_name,
                cv_mae,
                test_mae,
                test_rmse,
                test_r2,
                test_mape,
                best_params,
                is_best
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                trainingId,
                item.model,
                item.cv_mae || null,
                item.test_mae || null,
                item.test_rmse || null,
                item.test_r2 || null,
                item.test_mape || null,
                JSON.stringify(item.best_params || {}),
                item.is_best ? 1 : 0,
            ]
        );
    }
}

async function insertPredictions(trainingId, predictions) {
    for (const item of predictions) {
        await db.execute(
            `
            INSERT INTO ml_predictions
            (
                training_id,
                region,
                prediction_year,
                predicted_poverty_incidence
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                trainingId,
                item.region,
                item.prediction_year,
                item.regression_predicted_poverty_incidence,
            ]
        );
    }
}

async function insertForecasts(trainingId, forecasts) {
    for (const item of forecasts) {
        await db.execute(
            `
            INSERT INTO ml_forecasts
            (
                training_id,
                region,
                forecast_year,
                arima_forecast_poverty_incidence,
                arima_order,
                used_regression_prediction_in_training
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                trainingId,
                item.region,
                item.forecast_year,
                item.arima_forecast_poverty_incidence,
                item.arima_order || null,
                item.used_regression_prediction_in_training ? 1 : 0,
            ]
        );
    }
}

async function createActivityLog(userId, action, description = null) {
    await db.execute(
        `
        INSERT INTO ml_activity_logs
        (user_id, action, description)
        VALUES (?, ?, ?)
        `,
        [userId, action, description]
    );
}

async function getLatestTraining() {
    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_trainings
        ORDER BY created_at DESC
        LIMIT 1
        `
    );

    return rows[0] || null;
}

async function getLatestMetrics() {
    const latestTraining = await getLatestTraining();

    if (!latestTraining) return [];

    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_model_metrics
        WHERE training_id = ?
        ORDER BY is_best DESC, test_mae ASC
        `,
        [latestTraining.id]
    );

    return rows;
}

async function getLatestPredictions() {
    const latestTraining = await getLatestTraining();

    if (!latestTraining) return [];

    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_predictions
        WHERE training_id = ?
        ORDER BY region ASC, prediction_year ASC
        `,
        [latestTraining.id]
    );

    return rows;
}

async function getLatestForecasts() {
    const latestTraining = await getLatestTraining();

    if (!latestTraining) return [];

    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_forecasts
        WHERE training_id = ?
        ORDER BY region ASC, forecast_year ASC
        `,
        [latestTraining.id]
    );

    return rows;
}

async function getDatasetsByIds(uploadIds) {
    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
        return [];
    }

    const placeholders = uploadIds.map(() => "?").join(",");

    const [rows] = await db.execute(
        `
        SELECT *
        FROM ml_uploads
        WHERE id IN (${placeholders})
        AND is_archived = 0
        `,
        uploadIds
    );

    return rows;
}

async function markDatasetsAsMerged(uploadIds) {
    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
        return;
    }

    const placeholders = uploadIds.map(() => "?").join(",");

    await db.execute(
        `
        UPDATE ml_uploads
        SET 
            is_merged = 1,
            merged_at = CURRENT_TIMESTAMP,
            status = 'merged'
        WHERE id IN (${placeholders})
        `,
        uploadIds
    );
}

async function markFilesAsDeleted(uploadIds) {
    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
        return;
    }

    const placeholders = uploadIds.map(() => "?").join(",");

    await db.execute(
        `
        UPDATE ml_uploads
        SET file_deleted = 1
        WHERE id IN (${placeholders})
        `,
        uploadIds
    );
}

module.exports = {
    markFilesAsDeleted,
    markDatasetsAsMerged,
    getDatasetsByIds,
    createUpload,
    getDatasets,
    getDatasetById,
    updateDatasetName,
    updateDatasetFile,
    archiveDataset,
    getLatestUpload,
    updateUploadStatus,
    createTraining,
    updateTrainingCompleted,
    updateTrainingFailed,
    insertModelMetrics,
    insertPredictions,
    insertForecasts,
    createActivityLog,
    getLatestTraining,
    getLatestMetrics,
    getLatestPredictions,
    getLatestForecasts,
};