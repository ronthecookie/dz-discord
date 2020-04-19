import { Message, MessageEmbed } from "discord.js";
import {
    command,
    default as CookiecordClient,
    Module,
    CommonInhibitors,
} from "cookiecord";
import IsdPunishment, { IsdPunModel } from "../isdpunishment";

export default class IsdPunishmentsModule extends Module {
    constructor(client: CookiecordClient) {
        super(client);
    }
    async collectMessage(msg: Message) {
        const res = (
            await msg.channel.awaitMessages(
                (nm) => nm.author.id !== this.client.user?.id,
                {
                    max: 1,
                    time: 1000 * 60 * 2,
                    errors: ["time"],
                }
            )
        ).first();
        if (!res) throw new Error("couldnt collect message");
        return res;
    }
    @command()
    async punish(msg: Message) {
        msg.channel.send(
            "IGN of bad player? (2 minutes to reply, case insensitive)"
        );
        const violatorName = await (
            await this.collectMessage(msg)
        ).content.toLowerCase();
        msg.channel.send(`What did ${violatorName} do?`);
        const violation = await (await this.collectMessage(msg)).content;
        msg.channel.send(`Proof/Witnesses?`);
        const proof = await (await this.collectMessage(msg)).content;
        msg.channel.send(`What is ${violatorName}'s punishment?`);
        const punishment = await (await this.collectMessage(msg)).content;

        const pun = await IsdPunModel.create({
            proof,
            punisherID: msg.author.id,
            punishment,
            violation,
            violatorName,
            createdAt: Date.now(),
        } as IsdPunishment);
        msg.channel.send(`Made new punishment. (id is ${pun._id})`);
        console.log(pun);
    }

    @command()
    async lookup(msg: Message, name: string) {
        const CODEBLOCK = "```";
        const puns = await IsdPunModel.find({
            violatorName: name.toLowerCase(),
        }).exec();
        if (puns.length == 0) {
            await msg.channel.send(`nothing found on ${name.toLowerCase()}`);
        } else {
            puns.forEach(async (p) => {
                const punisher = isNaN(parseInt(p.punisherID))
                    ? p.punisherID
                    : await msg.guild?.members.fetch(p.punisherID);
                const embed = new MessageEmbed()
                    .setColor("RED")
                    .setDescription(p.violation)
                    .addField("Punishment", p.punishment)
                    .addField("Proof/Witnesses", p.proof)
                    .setFooter(
                        `id is ${p._id} | punished at${
                            !p.createdAt ? " UNKNOWN" : ""
                        }`
                    )
                    .setTimestamp(p.createdAt);
                if (typeof punisher == "string") embed.setAuthor(p.punisherID);
                else if (punisher)
                    embed.setAuthor(
                        punisher.user.tag,
                        punisher.user.displayAvatarURL()
                    );
                msg.channel.send({ embed });
            });
        }
    }

    @command({ inhibitors: [CommonInhibitors.botAdminsOnly] })
    async delall(msg: Message) {
        const res = await IsdPunModel.deleteMany({}).exec();
        msg.channel.send(`deleted ${res.deletedCount} entries`);
    }
    @command()
    async totalpuns(msg: Message) {
        const res = await IsdPunModel.count({}).exec();
        msg.channel.send(
            `${res} punishment${res !== 1 ? "s" : ""} have been issued.`
        );
    }
    @command({ inhibitors: [CommonInhibitors.botAdminsOnly], single: true })
    async importpuns(msg: Message, json: string) {
        const arr = (JSON.parse(json) as IsdPunishment[]).map((p) => {
            p.createdAt = 0;
            return p;
        });
        const res = await IsdPunModel.create(arr);
        msg.reply(`imported ${res.length} punishments`);
    }
}