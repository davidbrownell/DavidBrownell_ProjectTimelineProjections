// ----------------------------------------------------------------------
// |
// |  TimelineProjections.ts
// |
// |  David Brownell <db@DavidBrownell.com>
// |      2021-12-30 11:39:30
// |
// ----------------------------------------------------------------------
// |
// |  Copyright David Brownell 2021
// |  Distributed under the Boost Software License, Version 1.0. See
// |  accompanying file LICENSE_1_0.txt or copy at
// |  http://www.boost.org/LICENSE_1_0.txt.
// |
// ----------------------------------------------------------------------

export class TimelineInputEvent {
    public readonly date: Date

    public readonly total_points_completed: number;     // across all sprints
    public readonly total_points_pending: number;       // in current sprint
    public readonly total_points_active: number;        // in current sprint
    public readonly total_points_estimated: number;     // beyond current sprint
    public readonly total_points_unestimated: number;   // beyond current sprint

    public readonly team: string | undefined = undefined;
    public readonly opaque_data: any = undefined;
}

export class TimelineOutputEventTeamData {
    public readonly total_points: number;

    constructor(
        public readonly total_points_completed: number,
        public readonly total_points_pending: number,
        public readonly total_points_active: number,
        public readonly total_points_estimated: number,
        public readonly total_points_unestimated: number,

        public readonly average_velocity: number | undefined,
        public readonly min_velocity: number | undefined,
        public readonly max_velocity: number | undefined,

        public readonly opaque_data: any,
    ) {
        this.total_points =
            this.total_points_completed +
            this.total_points_pending +
            this.total_points_active +
            this.total_points_estimated +
            this.total_points_unestimated;
    }

    // BugBug: Return dates based on average velocities

    ProjectPendingDates(
        sprint_start: Date,
        days_in_sprint: number,
        velocities?: [number, number, number] | undefined,      // Calculated velocities are used if undefined
    ): [Date, Date, Date] | undefined {
        return this._ProjectDates(
            sprint_start,
            days_in_sprint,
            this.total_points_estimated,
            velocities || [this.average_velocity, this.min_velocity, this.max_velocity]
        );
    }

    ProjectUnestimatedDates(
        sprint_start: Date,
        days_in_sprint: number,
        velocities?: [number, number, number] | undefined,      // Calculated velocities are used if undefined
        factors: [number, number] = [0.5, 2]
    ): [Date, Date, Date] | undefined {
        const result1 = this._ProjectDates(
            sprint_start,
            days_in_sprint,
            this.total_points_estimated + this.total_points_unestimated * factors[0],
            velocities || [this.average_velocity, this.min_velocity, this.max_velocity]
        );

        if(result1 === undefined)
            return undefined;

        const result2 = this._ProjectDates(
            sprint_start,
            days_in_sprint,
            this.total_points_estimated + this.total_points_unestimated * factors[1],
            velocities || [this.average_velocity, this.min_velocity, this.max_velocity]
        );

        return [
            undefined, // BugBug
            result1[1],
            result2[1]
        ];
    }

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    _ProjectDates(
        sprint_start: Date,
        days_in_sprint: number,
        points: number,
        velocities: [number | undefined, number | undefined, number | undefined],
    ): [Date, Date, Date] | undefined {
        if(velocities[0] === undefined || velocities[1] === undefined || velocities[2] === undefined)
            return undefined;

        return [
            this._ProjectDate(sprint_start, days_in_sprint, points, velocities[0]),
            this._ProjectDate(sprint_start, days_in_sprint, points, velocities[1]),
            this._ProjectDate(sprint_start, days_in_sprint, points, velocities[2])
        ];
    }

    _ProjectDate(
        sprint_start: Date,
        days_in_sprint: number,
        remaining_points: number,
        velocity: number | undefined
    ): Date | undefined {
        if(velocity === undefined || velocity == 0)
            return undefined;

        const velocity_per_day = velocity / days_in_sprint;
        const remaining_days = remaining_points / velocity_per_day;
        const completion_date = _IncrementDate(sprint_start, remaining_days);

        return _AlignDateToSprintBoundary(sprint_start, days_in_sprint, completion_date);
    }
}


export class TimelineOutputEvent {
    public readonly total_points: number;

    constructor(
        public readonly date: Date,
        public readonly is_sprint_boundary: boolean,
        public readonly team_data: Record<string | undefined, TimelineOutputEventTeamData>,
        public readonly is_generated=false,
    ) {
        let total_points = 0;

        Object.keys(this.team_data).forEach(
            (team_name) => {
                total_points += this.team_data[team_name].total_points;
            }
        );

        this.total_points = total_points;
    }

    ProjectPendingDates(
        sprint_start: Date,
        days_in_sprint: number,
        velocities?: [number, number, number] | undefined,      // Calculated velocities are used if undefined
    ): [Date, Date, Date] | undefined {
        return this._ProjectDates(
            (team_data: TimelineOutputEventTeamData) => team_data.ProjectPendingDates(sprint_start, days_in_sprint, velocities),
        );
    }

    ProjectUnestimatedDates(
        sprint_start: Date,
        days_in_sprint: number,
        velocities?: [number, number, number] | undefined,      // Calculated velocities are used if undefined
        factors: [number, number] = [0.5, 2]
    ): [Date, Date, Date] | undefined {
        return this._ProjectDates(
            (team_data: TimelineOutputEventTeamData) => team_data.ProjectUnestimatedDates(sprint_start, days_in_sprint, velocities, factors),
        );
    }

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    _ProjectDates(
        get_dates_func: (arg: TimelineOutputEventTeamData) => [Date, Date, Date] | undefined,
    ): [Date, Date, Date] | undefined {
        let min_date: Date | undefined;
        let max_date: Date | undefined;

        Object.entries(this.team_data).forEach(
            ([team_name, team_data]) => {
                const result = get_dates_func(team_data);

                if(result === undefined)
                    return;

                if(min_date === undefined || result[1] > min_date)
                    min_date = result[1];
                if(max_date === undefined || result[2] > max_date)
                    max_date = result[2];
            }
        );

        if(min_date === undefined || max_date == undefined)
            return undefined;

        return [
            undefined, // BugBug
            min_date,
            max_date
        ];
    }
}


export function CreateTimelineEvents(
    input_events: TimelineInputEvent[],     // Must be in ascending order according to `date`
    days_in_sprint: number,
    any_sprint_boundary: Date,
    limit_velocity_calculations?: number,   // When calculating velocity, look at the last N sprints. Default is to look at all sprints.
    default_velocities?: [number, number],  // Velocities used when others can't be found
    today?: Date,
): TimelineOutputEvent[] {
    const updated_default_velocities: [number, number, number] | undefined = (() => {
        if(default_velocities === undefined)
            return undefined;

        return [
            (default_velocities[0] + default_velocities[1]) / 2,
            default_velocities[0],
            default_velocities[1],
        ];
    })();

    if(today === undefined)
        today = new Date();

    // ----------------------------------------------------------------------
    class VelocityInfo {
        public velocities: Array<number | undefined>;
        public prev_total_points_completed: number | undefined;

        public average_velocity: number | undefined;
        public min_velocity: number | undefined;
        public max_velocity: number | undefined;

        constructor(total_points_completed: number) {
            this.velocities = [];
            this.prev_total_points_completed = undefined;

            this.UpdateVelocity(total_points_completed);
        }

        public UpdateVelocity(total_points_completed: number | undefined) {
            if(total_points_completed !== undefined) {
                this.velocities.push(total_points_completed - (this.prev_total_points_completed || 0));
                this.prev_total_points_completed = total_points_completed;
            }
            else
                this.velocities.push(undefined);

            const starting_index = (() => {
                if(limit_velocity_calculations !== undefined && this.velocities.length > limit_velocity_calculations)
                    return this.velocities.length - limit_velocity_calculations;

                return 0;
            })();

            let min_v = undefined;
            let max_v = undefined;
            let total_points = 0;
            let num_sprints = 0;

            for(let index = starting_index; index != this.velocities.length; index++) {
                const velocity = this.velocities[index];

                if(velocity === undefined)
                    continue;

                total_points += velocity;
                num_sprints += 1;

                if(min_v === undefined || velocity < min_v)
                    min_v = velocity;
                if(max_v === undefined || velocity > max_v)
                    max_v = velocity;
            }

            if(num_sprints === 0)
                this._SetDefaultVelocities();
            else {
                this.average_velocity = total_points / num_sprints;
                this.min_velocity = min_v;
                this.max_velocity = max_v;
            }
        }

        // ----------------------------------------------------------------------
        // ----------------------------------------------------------------------
        // ----------------------------------------------------------------------
        private _SetDefaultVelocities() {
            if(updated_default_velocities !== undefined) {
                this.average_velocity = updated_default_velocities[0];
                this.min_velocity = updated_default_velocities[1];
                this.max_velocity = updated_default_velocities[2];
            }
            else {
                this.average_velocity = undefined;
                this.min_velocity = undefined;
                this.max_velocity = undefined;
            }
        }
    }

    // ----------------------------------------------------------------------
    let velocity_infos: Record<string | undefined, VelocityInfo> = {};
    let results: TimelineOutputEvent[] = []

    function CommitDateInfo(date: Date, input_event_start_index: number, input_event_end_index: number): TimelineOutputEvent {
        const is_sprint_boundary = _AlignDateToSprintBoundary(
            any_sprint_boundary,
            days_in_sprint,
            date,
        ).getTime() === date.getTime();

        // Update velocities if we are looking at a sprint boundary
        if(is_sprint_boundary) {
            let recognized_teams = new Set<string | undefined>(Object.keys(velocity_infos));

            for(let index = input_event_start_index; index != input_event_end_index; index++) {
                const event = input_events[index];

                if(recognized_teams.has(event.team)) {
                    recognized_teams.delete(event.team);
                    velocity_infos[event.team].UpdateVelocity(event.total_points_completed);
                }
                else
                    velocity_infos[event.team] = new VelocityInfo(event.total_points_completed);
            }

            recognized_teams.forEach(
                (team_name) => {
                    velocity_infos[team_name].UpdateVelocity(undefined);
                }
            );
        }

        // Calculate the team info
        let team_data: Record<string | undefined, TimelineOutputEventTeamData> = {};

        for(let index = input_event_start_index; index != input_event_end_index; index++) {
            const event = input_events[index];
            const [average_v, min_v, max_v] = (() => {
                const velocity_info = velocity_infos[event.team];

                if(velocity_info === undefined)
                    return [undefined, undefined, undefined];

                return [
                    velocity_info.average_velocity,
                    velocity_info.min_velocity,
                    velocity_info.max_velocity,
                ];
            })();

            team_data[event.team] = new TimelineOutputEventTeamData(
                event.total_points_completed,
                event.total_points_pending,
                event.total_points_active,
                event.total_points_estimated,
                event.total_points_unestimated,
                average_v,
                min_v,
                max_v,
                event.opaque_data
            );
        }

        let is_generated: boolean;

        if(input_event_start_index === input_event_end_index) {
            is_generated = true;

            if(results.length !== 0)
                team_data = results[results.length - 1].team_data;
        }
        else
            is_generated = false;

        return new TimelineOutputEvent(
            date,
            is_sprint_boundary,
            team_data,
            is_generated,
        );
    }

    // ----------------------------------------------------------------------
    function DateOnly(date: Date | string): Date {
        var result = new Date(date);

        result.setHours(0, 0, 0, 0);
        return result;
    }

    // ----------------------------------------------------------------------

    let index = 0;
    let expected_date: Date | undefined = undefined;

    while(index !== input_events.length) {
        const this_date = DateOnly(input_events[index].date);

        // @ts-ignore: isNaN
        if(!(this_date instanceof Date && !isNaN(this_date)))
            throw new Error(`Invalid date, index '${index}'.`);

        // Fill in missing dates
        if(expected_date !== undefined) {
            while(expected_date.getTime() !== this_date.getTime()) {
                results.push(CommitDateInfo(expected_date, index, index));
                expected_date = _IncrementDate(expected_date);
            }
        }

        // Group all input events associated with this day
        const starting_index = index;

        while(index !== input_events.length && DateOnly(input_events[index].date).getTime() == this_date.getTime())
            index += 1;

        // Commit the values
        results.push(CommitDateInfo(this_date, starting_index, index));
        expected_date = _IncrementDate(this_date);
    }

    return results;
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
function _IncrementDate(date: Date, days: number=1): Date {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function _DaysSinceEpoch(date: Date): number {
    const milliseconds_per_day = 8.64e7;

    return Math.floor(date.getTime() / milliseconds_per_day);
}

function _AlignDateToSprintBoundary(
    any_sprint_boundary: Date,
    days_in_sprint: number,
    date_to_align: Date
): Date {
    const sprint_boundary_days = _DaysSinceEpoch(any_sprint_boundary);
    const align_boundary_days = _DaysSinceEpoch(date_to_align);
    const days_diff = align_boundary_days - sprint_boundary_days;
    const sprints_diff = Math.floor((days_diff + days_in_sprint - 1) / days_in_sprint);

    return _IncrementDate(any_sprint_boundary, sprints_diff * days_in_sprint);
}
