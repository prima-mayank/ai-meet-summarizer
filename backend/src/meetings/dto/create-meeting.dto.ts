export class CreateMeetingDto {
  title: string;
  meetingId: string;
  date?: Date;       
  transcript?: string;
  summary?: string;
}