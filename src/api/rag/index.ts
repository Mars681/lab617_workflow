/**
 * ==============================================================================
 * RAG Service Interface Documentation
 * ==============================================================================
 * This module abstracts the communication with the RAG (Retrieval-Augmented Generation) backend.
 * Logic is split into sub-modules matching backend routes.
 */

export * from './config';
export * from './healthService';
export * from './projectService';
export * from './queryService';
export * from './documentService';