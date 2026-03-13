import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { sendSuccess, sendError } from '../utils/response';
import { analyticsService } from '../services/analytics.service';

export const getReports = async (req: Request, res: Response) => {
    try {
        const dirPath = path.join(process.cwd(), 'analytics-reports');
        if (!fs.existsSync(dirPath)) {
            return sendSuccess(res, { reports: [] });
        }

        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
        const reports = files.map(f => {
            const stats = fs.statSync(path.join(dirPath, f));
            return {
                filename: f,
                date: f.replace('dashboard_export_', '').replace('.csv', ''),
                size: stats.size,
                createdAt: stats.birthtime
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return sendSuccess(res, { reports });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return sendError(res, 500, 'Failed to list analytics reports', 'FETCH_ERROR');
    }
};

export const downloadReport = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(process.cwd(), 'analytics-reports', filename);

        if (!fs.existsSync(filePath)) {
            return sendError(res, 404, 'Report not found', 'NOT_FOUND');
        }

        res.download(filePath, filename);
    } catch (error) {
        console.error('Error downloading report:', error);
        // Not using standard envelope for downloads
        res.status(500).send('Failed to download report');
    }
};

// Expose manual trigger for testing
export const triggerExport = async (req: Request, res: Response) => {
    try {
        const result = await analyticsService.processDailyExport();
        if (result.success) {
            return sendSuccess(res, { message: 'Daily export completed manually', file: result.filePath });
        } else {
            return sendError(res, 500, 'Failed to process export', 'EXPORT_ERROR');
        }
    } catch (error) {
        console.error('Error triggering export:', error);
        return sendError(res, 500, 'Error triggering export', 'EXPORT_ERROR');
    }
};
