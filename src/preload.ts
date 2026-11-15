import { contextBridge, ipcRenderer } from 'electron';
import type { NewBook, ReadingFlowApi } from './shared';

const api: ReadingFlowApi = {
  getActiveReading: () => ipcRenderer.invoke('reading:active'),
  startReading: (bookId, startPage) =>
    ipcRenderer.invoke('reading:start', bookId, startPage),
  finishReading: (endPage) => ipcRenderer.invoke('reading:finish', endPage),
  pauseReading: () => ipcRenderer.invoke('reading:pause'),
  resumeReading: () => ipcRenderer.invoke('reading:resume'),
  getAccount: () => ipcRenderer.invoke('account:get'),
  createProfile: (input) => ipcRenderer.invoke('account:create', input),
  updateProfile: (input) => ipcRenderer.invoke('account:update', input),
  setTheme: (theme) => ipcRenderer.invoke('settings:theme', theme),
  listBooks: () => ipcRenderer.invoke('books:list'),
  addBook: (book: NewBook) => ipcRenderer.invoke('books:add', book),
  updateBookCover: (id, cover) =>
    ipcRenderer.invoke('books:update-cover', id, cover),
  listCalendarEntries: (start, end) =>
    ipcRenderer.invoke('calendar:list', start, end),
  databaseInfo: () => ipcRenderer.invoke('database:info'),
};
contextBridge.exposeInMainWorld('api', api);
