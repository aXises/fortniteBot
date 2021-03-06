import * as winston from "winston";
import Logger from "log/Logger";
import { prop, Typegoose, ModelType, InstanceType, instanceMethod, staticMethod, arrayProp } from "typegoose";
import * as Mongoose from "mongoose";
import { GuildConfig } from "config/GuildBooleanConfig";
import { isUndefined } from "util";
import NikkuException from "exception/NikkuException";

export default class DBGuildPropertySchema extends Typegoose {
    private static readonly logger: winston.Logger = new Logger(DBGuildPropertySchema.constructor.name).getLogger();

    @prop({required: true, unique: true})
    public id: string;

    @arrayProp({default: [], items: String})
    public targets: string[];

    @prop({default: {}})
    public booleanConfig: any;

    @instanceMethod
    public async addTarget(this: InstanceType<any> & Mongoose.Document, target: string): Promise<void> {
        this.targets.push(target);
        try {
            return await this.save();
        } catch (err) {
            DBGuildPropertySchema.logger.error("Failed to save guild targets.");
            throw err;
        }
    }

    @instanceMethod
    public async removeTarget(this: InstanceType<any> & Mongoose.Document, target: string): Promise<void> {
        const index = this.targets.indexOf(target);
        if (index === -1) {
            DBGuildPropertySchema.logger.verbose("Target does not exist on current guild target list.");
            return Promise.reject();
        }
        this.targets.splice(index, 1);
        try {
            return await this.save();
        } catch (err) {
            DBGuildPropertySchema.logger.error("Remove target, failed to save document.");
            throw err;
        }
    }

    @instanceMethod
    public async addBooleanConfig(this: InstanceType<any> & Mongoose.Document, configName: string, initValue?: boolean): Promise<void> {
        try {
            await this.markModified("booleanConfig");
            if (!this.booleanConfig) {
                this.booleanConfig = {};
            }
            if (isUndefined(this.booleanConfig[configName])) {
                this.booleanConfig[configName] = initValue ? initValue : false;
            }
            return await this.save();
        } catch (err) {
            DBGuildPropertySchema.logger.error("Failed to add new configuration.");
            throw err;
        }
    }

    @instanceMethod
    public async booleanConfigExists(this: InstanceType<any> & Mongoose.Document, configName: string): Promise<boolean> {
        try {
            return !isUndefined(this.booleanConfig[configName]);
        } catch (err) {
            DBGuildPropertySchema.logger.error("Failed to retrieve configuration.");
            throw err;
        }
    }

    @instanceMethod
    public async getAllBooleanConfig(this: InstanceType<any> & Mongoose.Document): Promise<boolean> {
        return this.booleanConfig;
    }

    @instanceMethod
    public async getBooleanConfig(this: InstanceType<any> & Mongoose.Document,
            configName: GuildConfig.BooleanConfig.Options): Promise<boolean> {
        const enumOptions = GuildConfig.BooleanConfig.Options;
        try {
            if (isUndefined(this.booleanConfig[enumOptions[configName]])) {
                throw new NikkuException(undefined, "Undefined config name.");
            }
            return this.booleanConfig[enumOptions[configName]];
        } catch (err) {
            DBGuildPropertySchema.logger.error("Unable to retrieve configuration.");
            throw err;
        }
    }

    @instanceMethod
    public async setBooleanConfig(this: InstanceType<any> & Mongoose.Document, configName: string, value: boolean): Promise<boolean> {
        try {
            if (isUndefined(this.booleanConfig[configName])) {
                throw new NikkuException(undefined, "Undefined config name.");
            }
            await this.markModified("booleanConfig");
            this.booleanConfig[configName] = value;
            return await this.save();
        } catch (err) {
            DBGuildPropertySchema.logger.error("Unable to retrieve configuration.");
            throw err;
        }
    }

    public static async getGuildById(id: string): Promise<DBGuildPropertySchema> {
        return await (this.getModel().findOne({id}));
    }

    public static async getAllGuild(): Promise<DBGuildPropertySchema[]> {
        return await (this.getModel().find({}));
    }

    public static async registerGuild(id: string): Promise<void> {
        const Model = this.getModel();
        const model = new Model({
            id,
            targets: [],
            booleanConfig: {},
        });
        try {
            for (const key of GuildConfig.BooleanConfig.keys) {
                if (!(await model.booleanConfigExists(key))) {
                    await model.addBooleanConfig(key);
                }
            }
            await model.save();
            this.logger.info("Setup guild properties document.");
        } catch (err) {
            this.logger.error("Failed to setup guild properties document.");
            throw err;
        }
    }

    public static async registerGuildIfNotExist(id: string): Promise<void> {
        if (!(await this.getGuildById(id))) {
            await this.registerGuild(id);
        }
    }

    public static getModel(): Mongoose.Model<InstanceType<DBGuildPropertySchema>> & DBGuildPropertySchema & typeof DBGuildPropertySchema {
        return new DBGuildPropertySchema().getModelForClass(DBGuildPropertySchema);
    }
}
