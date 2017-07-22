import * as fs from 'fs-extra';
import CRUDEngine from './CRUDEngine';
import path = require('path');

export default class FileEngine implements CRUDEngine {
  public storeName: string;

  constructor(storeName: string) {
    this.storeName = path.normalize(storeName);
  }

  create<T>(tableName: string, primaryKey: string, entity: any): Promise<string> {
    // TODO: Implement "base64" serialization to save any kind of data.
    const file: string = path.normalize(`${this.storeName}/${tableName}/${primaryKey}.dat`);
    if (typeof entity === 'object') {
      try {
        entity = JSON.stringify(entity);
      } catch (error) {
        entity = entity.toString();
      }
    }
    return fs.outputFile(file, entity).then(() => primaryKey);
  }

  delete(tableName: string, primaryKey: string): Promise<string> {
    const file: string = path.normalize(`${this.storeName}/${tableName}/${primaryKey}.dat`);
    return fs.remove(file).then(() => primaryKey).catch(() => false);
  }

  deleteAll(tableName: string): Promise<boolean> {
    const directory: string = path.normalize(`${this.storeName}/${tableName}`);
    return fs.remove(directory).then(() => true).catch(() => false);
  }

  read<T>(tableName: string, primaryKey: string): Promise<T> {
    const file: string = path.normalize(`${this.storeName}/${tableName}/${primaryKey}.dat`);

    return new Promise((resolve, reject) => {
      fs.readFile(file, {encoding: 'utf8', flag: 'r'}, function (error, data: any) {
        if (error) {
          if (error.code === 'ENOENT') {
            resolve(undefined);
          } else {
            reject(error);
          }
        } else {
          try {
            data = JSON.parse(data);
          } catch (error) {
          }
          resolve(data);
        }
      });
    });
  }

  readAll<T>(tableName: string): Promise<T[]> {
    const directory: string = path.normalize(`${this.storeName}/${tableName}`);
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (error, files) => {
        if (error) {
          reject(error);
        } else {
          const recordNames = files.map((file) => path.basename(file, path.extname(file)));
          const promises = recordNames.map((primaryKey) => this.read(tableName, primaryKey));
          Promise.all(promises).then((records: T[]) => resolve(records));
        }
      });
    });
  }

  readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const directory: string = path.normalize(`${this.storeName}/${tableName}`);
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (error, files) => {
        if (error) {
          if (error.code === 'ENOENT') {
            resolve([]);
          } else {
            reject(error);
          }
        } else {
          const fileNames: string[] = files.map((file: string) => path.parse(file).name);
          resolve(fileNames);
        }
      })
    });
  }

  // TODO: Make this function also work for binary data.
  update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.read(tableName, primaryKey)
      .then((record: any) => {
        if (typeof record === 'string') {
          record = JSON.parse(record);
        }
        const updatedRecord: Object = Object.assign(record, changes);
        return JSON.stringify(updatedRecord);
      })
      .then((updatedRecord: any) => this.create(tableName, primaryKey, updatedRecord));
  }
}