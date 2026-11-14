import { contextBridge, ipcRenderer } from 'electron';
import type { NewBook, ReadingFlowApi } from './shared';

const api: ReadingFlowApi = {
  getAccount: () => ipcRenderer.invoke('account:get'),
  createProfile: (input) => ipcRenderer.invoke('account:create', input),
  setTheme: (theme) => ipcRenderer.invoke('settings:theme', theme),
  listBooks: () => ipcRenderer.invoke('books:list'),
  addBook: (book: NewBook) => ipcRenderer.invoke('books:add', book),
  updateBookCover: (id, cover) =>
    ipcRenderer.invoke('books:update-cover', id, cover),
  listCalendarEntries: (start, end) =>
    ipcRenderer.invoke('calendar:list', start, end),
  addReadingPlan: (plan) => ipcRenderer.invoke('calendar:add-plan', plan),
  databaseInfo: () => ipcRenderer.invoke('database:info'),
};
contextBridge.exposeInMainWorld('api', api);
