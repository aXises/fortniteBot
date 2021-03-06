import * as MongoDb from "mongodb";
import * as Mongoose from "mongoose";
import * as winston from "winston";
import * as Discord from "discord.js";
import DBUserSchema from "database/schemas/DBUserSchema";
import DBGlobalPropertySchema from "database/schemas/DBGlobalPropertySchema";
import Logger from "log/Logger";
import { UserMigration } from "database/migration/UserMigration";
import { GlobalPropertyMigration } from "database/migration/GlobalPropertyMigration";
import { GuildPropertyMigration } from "database/migration/GuildPropertyMigration";
import { BradPropertyMigration } from "database/migration/BradPropertyMigration";
import NikkuCore from "./NikkuCore";
import { AccessLevel } from "user/AccessLevel";
import DBBradPropertySchema from "database/schemas/DBBradPropertySchema";

export default class DatabaseCore {
    private readonly logger: winston.Logger = new Logger(this.constructor.name).getLogger();

    private readonly URL: string;

    /**
     * Database connection.
     */
    private static connection: Mongoose.Connection;

    private defaultUsers: string[];

    private core: NikkuCore;

    private ready: boolean;
    /**
     * @classdesc Class for handling important database methods.
     */
    public constructor(core: NikkuCore) {
        this.URL = core.getConfig().Database.URL;
        this.defaultUsers = core.getConfig().DefaultUser.IDS;
        this.core = core;
        this.ready = false;
        this.logger.debug("Database Core created.");
    }

    public static setConnection(connection: Mongoose.Connection): void {
        this.connection = connection;
    }

    public static getConnection(): Mongoose.Connection {
        return this.connection;
    }

    /**
     * Attempts to connect to the host.
     */
    public async connectDb(): Promise<{}> {
        return new Promise((resolve, reject) => {
            Mongoose.connect(this.URL, { useNewUrlParser: true });
            DatabaseCore.setConnection(Mongoose.connection);
            const connection = DatabaseCore.getConnection();
            connection.on("error", (err) => {
                this.logger.error(`Error connecting to DB: ${err}.`);
                reject(err);
            });
            connection.once("open", async () => {
                await this.generateModelsIfEmpty();
                this.ready = true;
                this.logger.info("Database connected successfully.");
                const doc = await DBBradPropertySchema.getBrad();
                this.core.setActivity(`Brad's Weight: ${doc.weight.toFixed(4)}kg`);
                resolve();
            });
        });
    }

    public async generateDevUserModel(): Promise<void> {
        if (!this.core.getConfig().DefaultUser.IDS) {
            return;
        }
        const userModel = DBUserSchema.getModel();
        const doc: Mongoose.Document[] = await userModel.find({accessLevel: AccessLevel.DEVELOPER});
        if (doc.length !== this.defaultUsers.length) {
            this.logger.warn(`Dev user models do not match. Creating ${this.defaultUsers.length - doc.length} dev profile(s).`);
            await UserMigration.createModels(this.defaultUsers);
        }
    }

    public async generateGlobalPropertyModel(): Promise<void> {
        const globalPropertyModel = DBGlobalPropertySchema.getModel();
        const doc: Mongoose.Document[] = await globalPropertyModel.find({});
        if (doc.length === 0) {
            this.logger.warn("Global properties document has not been setup. Creating default profiles.");
            await GlobalPropertyMigration.createModels();
        }
    }

    public async generateGuildPropertyModel(): Promise<void> {
        await GuildPropertyMigration.verifyGuildConfig();
    }

    public async generateBradPropertyModel(): Promise<void> {
        if (!(await DBBradPropertySchema.getBrad())) {
            this.logger.warn("Brad properties document has not been setup. Creating default profiles.");
            await BradPropertyMigration.createModels();
        }
    }

    public async generateModelsIfEmpty(): Promise<void> {
        await Promise.all([
            this.generateDevUserModel(),
            this.generateGlobalPropertyModel(),
            this.generateGuildPropertyModel(),
            this.generateBradPropertyModel(),
        ]);
    }

    /**
     * Gets the current database.
     */
    public static getDb(): MongoDb.Db {
        return this.connection.db;
    }

    /**
     * Closes connection to the host of the db.
     */
    public closeConnection(): void {
        this.logger.warn("Connection to DB closed.");
        DatabaseCore.getConnection().close();
        this.ready = false;
    }

    public isReady(): boolean {
        return this.ready;
    }
}
