import { 
  CommandInteraction, 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  Client,
  Collection
} from 'discord.js';

export interface SlashCommand {
  data: SlashCommandBuilder | any; // any needed for some complex builders
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  cooldown?: number; // seconds
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

// Augment Client to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, SlashCommand>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}
