class Schedule {

  static KEY_STORAGE = 'schedule';

  schedule = [];

  constructor() {
    const res = localStorage.getItem(Schedule.KEY_STORAGE);
    this.schedule = res ? JSON.parse(res) || [] : [];

  }

  addSchedule(item) {
    const index = this.schedule.findIndex(i => i.id === item.id);
    if (index > -1) {
      this.schedule[index] = item;
      console.log(this.schedule);
    } else {
      this.schedule.push(item);
    }
    this.setAsyncStorage();
  }

  removeSchedule(id) {
    this.schedule = this.schedule.filter(i => i.id !== id);
    this.setAsyncStorage();
    return this.schedule;
  }

  getSchedule() {
    return this.schedule;
  }

  removeItem() {
    this.schedule = [];
    console.log('this.schedule', this.schedule);
    this.setAsyncStorage();
  }

  setAsyncStorage() {
    localStorage.setItem(Schedule.KEY_STORAGE, JSON.stringify(this.schedule));
  }

}

const ScheduleManager = new Schedule();

export default ScheduleManager;
