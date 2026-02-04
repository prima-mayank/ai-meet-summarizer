import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MeetingDocument = HydratedDocument<Meeting>;

@Schema({ timestamps: true }) 
export class Meeting {
  @Prop({ required: true })
  title: string;

  @Prop()
  meetingId: string; 

  @Prop()
  date: Date;

  @Prop()
  transcript: string; 

  @Prop()
  summary: string; // The AI-generated summary

  @Prop([String])
  actionItems: string[]; // List of tasks extracted
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);