import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { openDatabase } from './database';
import type { NewBook, ProfileInput, ReadingPlan, Theme } from './shared';

let database: ReturnType<typeof openDatabase> | undefined;
function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 700,
    minHeight: 600,
    title: 'ReadingFlow',
    backgroundColor: '#f5f5ee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL)
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
}
if (started) app.quit();
else {
  app
    .whenReady()
    .then(() => {
      const filename = path.join(
        app.isPackaged ? app.getPath('userData') : app.getAppPath(),
        'readingflow.db',
      );
      database = openDatabase(filename);
      const verify = (event: Electron.IpcMainInvokeEvent) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window || event.senderFrame !== event.sender.mainFrame)
          throw new Error('Недозволений запит.');
      };
      ipcMain.handle('books:list', (event) => {
        verify(event);
        return database!.listBooks();
      });
      ipcMain.handle('reading:active', (event) => {
        verify(event);
        return database!.getActiveReading();
      });
      ipcMain.handle(
        'reading:start',
        (event, bookId: number, startPage: number) => {
          verify(event);
          return database!.startReading(bookId, startPage);
        },
      );
      ipcMain.handle('reading:finish', (event, endPage: number) => {
        verify(event);
        return database!.finishReading(endPage);
      });
      ipcMain.handle('account:get', (event) => {
        verify(event);
        return database!.getAccount();
      });
      ipcMain.handle('account:create', (event, input: ProfileInput) => {
        verify(event);
        return database!.createProfile(input);
      });
      ipcMain.handle('settings:theme', (event, theme: Theme) => {
        verify(event);
        database!.setTheme(theme);
      });
      ipcMain.handle('books:add', (event, input: NewBook) => {
        verify(event);
        return database!.addBook(input);
      });
      ipcMain.handle(
        'books:update-cover',
        (event, id: number, cover: Uint8Array | null) => {
          verify(event);
          return database!.updateBookCover(id, cover);
        },
      );
      ipcMain.handle('calendar:list', (event, start: number, end: number) => {
        verify(event);
        return database!.listCalendarEntries(start, end);
      });
      ipcMain.handle('calendar:add-plan', (event, plan: ReadingPlan) => {
        verify(event);
        database!.addReadingPlan(plan);
      });
      ipcMain.handle('calendar:log-session', (event, session: ReadingPlan) => {
        verify(event);
        database!.logReadingSession(session);
      });
      ipcMain.handle('database:info', (event) => {
        verify(event);
        return database!.info();
      });
      createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error: unknown) => {
      dialog.showErrorBox('Не вдалося запустити ReadingFlow', String(error));
      app.quit();
    });
}
app.on('before-quit', () => {
  database?.close();
  database = undefined;
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
