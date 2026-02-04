import { Injectable } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Meeting } from './entities/meeting.entity';
import { Model } from 'mongoose';

@Injectable()
export class MeetingsService {

constructor(@InjectModel(Meeting.name) private meetingModel: Model<Meeting>) {}

  create(createMeetingDto: CreateMeetingDto) {
    const createdMeeting = new this.meetingModel(createMeetingDto);
    return createdMeeting.save();
  }
   

  findAll() {
    return this.meetingModel.find().exec();
  }

  findOne(id: number) {
    return `This action returns a #${id} meeting`;
  }

  update(id: number, updateMeetingDto: UpdateMeetingDto) {
    return `This action updates a #${id} meeting`;
  }

  remove(id: number) {
    return `This action removes a #${id} meeting`;
  }
}
