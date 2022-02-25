// ----------------------------------------------------------------------
// |
// |  TimelineProjections.ts
// |
// |  David Brownell <db@DavidBrownell.com>
// |      2021-12-30 11:39:30
// |
// ----------------------------------------------------------------------
// |
// |  Copyright David Brownell 2021-22
// |  Distributed under the Boost Software License, Version 1.0. See
// |  accompanying file LICENSE_1_0.txt or copy at
// |  http://www.boost.org/LICENSE_1_0.txt.
// |
// ----------------------------------------------------------------------

import { StatsInfo } from './SharedTypes';


export function ToDate(date: Date | string): Date {
    var result = new Date(date);

    // Convert from UTC to local time
    result.setMinutes(result.getMinutes() + result.getTimezoneOffset());

    // Remove the time component
    result.setHours(0, 0, 0, 0);

    return result;
}


export function CompareDates(a: Date, b: Date): number {
    const ta = a.getTime();
    const tb = b.getTime();

    if(ta < tb) return -1;
    if(ta > tb) return 1;

    return 0;
}


export interface TimelineInputEvent {
    readonly date: Date | string;

    readonly total_points_completed: number;            // across all sprints
    readonly total_points_pending: number;              // in current sprint
    readonly total_points_active: number;               // in current sprint
    readonly total_points_estimated: number;            // beyond current sprint
    readonly num_unestimated_items: number;             // beyond current sprint

    readonly team?: string;
    readonly opaque_data?: any;
}


export class TimelineOutputEventTeamData {
    public readonly total_points: number;

    constructor(
        public readonly total_points_completed: number,
        public readonly total_points_pending: number,
        public readonly total_points_active: number,
        public readonly total_points_estimated: number,
        public readonly num_unestimated_items: number,
        public readonly total_points_unestimated: number,

        public readonly velocity: StatsInfo<number> | undefined,
        public readonly opaque_data: any,
    ) {
        this.total_points =
            this.total_points_completed +
            this.total_points_pending +
            this.total_points_active +
            this.total_points_estimated +
            this.total_points_unestimated;
    }

    ProjectDates = (
        next_sprint_start: Date,
        days_in_sprint: number,
        unestimated_velocity_factors: [number, number],
        velocity_overrides?: StatsInfo<number>,
    ): [
        StatsInfo<Date> | undefined,        // estimated
        StatsInfo<Date> | undefined,        // remaining
    ] => {
        // Estimated
        const estimated_result = this._ProjectDatesImpl(
            next_sprint_start,
            days_in_sprint,
            this.total_points_estimated,
            velocity_overrides || this.velocity,
        );

        // Remaining
        let remaining_result = this._ProjectDatesImpl(
            next_sprint_start,
            days_in_sprint,
            this.total_points_estimated + this.total_points_unestimated * unestimated_velocity_factors[0],
            velocity_overrides || this.velocity,
        );

        if(remaining_result !== undefined) {
            const max_remaining_result = this._ProjectDatesImpl(
                next_sprint_start,
                days_in_sprint,
                this.total_points_estimated + this.total_points_unestimated * unestimated_velocity_factors[1],
                velocity_overrides || this.velocity,
            );

            let average_date = new Date();

            average_date.setTime((remaining_result.min.getTime() + max_remaining_result.max.getTime()) / 2);
            average_date.setHours(0, 0, 0, 0);

            average_date = _AlignDateToSprintBoundary(next_sprint_start, days_in_sprint, average_date);

            remaining_result = new StatsInfo<Date>(
                average_date,
                remaining_result.min,
                max_remaining_result.max,
            );
        }

        return [estimated_result, remaining_result];
    }

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    _ProjectDatesImpl = (
        next_sprint_start: Date,
        days_in_sprint: number,
        total_points: number,
        velocities: StatsInfo<number> | undefined,
    ): StatsInfo<Date> | undefined => {
        if(velocities === undefined)
            return undefined;

        if(
            velocities.min === 0
            && velocities.average === 0
            && velocities.max === 0
        )
            return undefined;

        return new StatsInfo<Date>(
            this._ProjectDate(next_sprint_start, days_in_sprint, total_points, velocities.average),
            this._ProjectDate(next_sprint_start, days_in_sprint, total_points, velocities.max),
            this._ProjectDate(next_sprint_start, days_in_sprint, total_points, velocities.min),
        );
    }

    _ProjectDate = (
        next_sprint_start: Date,
        days_in_sprint: number,
        remaining_points: number,
        velocity: number
    ): Date => {
        if(velocity === 0)
            return new Date("2100-12-31");

        const velocity_per_day = velocity / days_in_sprint;
        const remaining_days = remaining_points / velocity_per_day;
        const completion_date = IncrementDate(next_sprint_start, remaining_days);

        return _AlignDateToSprintBoundary(next_sprint_start, days_in_sprint, completion_date);
    }
}


export class TimelineOutputEvent {
    public readonly total_points: number;

    public readonly total_points_completed: number;
    public readonly total_points_pending: number;
    public readonly total_points_active: number;
    public readonly total_points_estimated: number;
    public readonly total_points_unestimated: number;
    public readonly total_num_unestimated_items: number;

    public readonly average_velocities: StatsInfo<number>;

    public velocity_overrides: StatsInfo<number> | undefined = undefined;
    public estimated_dates: StatsInfo<Date> | undefined = undefined;
    public remaining_dates: StatsInfo<Date> | undefined = undefined;

    constructor(
        public readonly date: Date,
        public readonly is_sprint_boundary: boolean,
        public readonly is_generated: boolean,
        public readonly team_data: Record<string | undefined, TimelineOutputEventTeamData>,
    ) {
        let total_points = 0;
        let total_completed = 0;
        let total_pending = 0;
        let total_active = 0;
        let total_estimated = 0;
        let total_unestimated = 0;
        let total_num_unestimated_items = 0;
        let average_velocity_calc = 0;
        let min_velocity_calc = 0;
        let max_velocity_calc = 0;

        Object.keys(this.team_data).forEach(
            (team_name) => {
                total_points += this.team_data[team_name].total_points;
                total_completed += this.team_data[team_name].total_points_completed;
                total_pending += this.team_data[team_name].total_points_pending;
                total_active += this.team_data[team_name].total_points_active;
                total_estimated += this.team_data[team_name].total_points_estimated;
                total_unestimated += this.team_data[team_name].total_points_unestimated;
                total_num_unestimated_items += this.team_data[team_name].num_unestimated_items;

                if(this.team_data[team_name].velocity !== undefined) {
                    average_velocity_calc += this.team_data[team_name].velocity.average * this.team_data[team_name].total_points_completed;
                    min_velocity_calc += this.team_data[team_name].velocity.min * this.team_data[team_name].total_points_completed;
                    max_velocity_calc += this.team_data[team_name].velocity.max * this.team_data[team_name].total_points_completed;
                }
            }
        );

        this.total_points = total_points;
        this.total_points_completed = total_completed;
        this.total_points_pending = total_pending;
        this.total_points_active = total_active;
        this.total_points_estimated = total_estimated;
        this.total_num_unestimated_items = total_num_unestimated_items;
        this.total_points_unestimated = total_unestimated;

        if(total_completed !== 0) {
            this.average_velocities = new StatsInfo<number>(
                average_velocity_calc / total_completed,
                min_velocity_calc / total_completed,
                max_velocity_calc / total_completed,
            );
        }
    }

    ProjectDates = (
        next_sprint_start: Date,
        days_in_sprint: number,
        unestimated_velocity_factors: [number, number],
        velocity_overrides?: StatsInfo<number>,
    ) => {
        let estimated_time = 0;
        let estimated_points = 0;
        let estimated_min: Date | undefined = undefined;
        let estimated_max: Date | undefined = undefined;
        let remaining_time = 0;
        let remaining_points = 0;
        let remaining_min: Date | undefined = undefined;
        let remaining_max: Date | undefined = undefined;

        Object.values(this.team_data).forEach(
            (team_data) => {
                const results = team_data.ProjectDates(
                    next_sprint_start,
                    days_in_sprint,
                    unestimated_velocity_factors,
                    velocity_overrides,
                );

                // Estimated
                const estimated = results[0];

                if(estimated !== undefined) {
                    estimated_time += estimated.average.getTime() * team_data.total_points_estimated;
                    estimated_points += team_data.total_points_estimated;

                    if(estimated_min === undefined || CompareDates(estimated_min, estimated.min) < 0)
                        estimated_min = estimated.min;
                    if(estimated_max === undefined || CompareDates(estimated.max, estimated_max) > 0)
                        estimated_max = estimated.max;
                }

                // Remaining
                const remaining = results[1];

                if(remaining !== undefined) {
                    const this_remaining_points = team_data.total_points_estimated + team_data.total_points_unestimated;

                    remaining_time += remaining.average.getTime() * this_remaining_points;
                    remaining_points += this_remaining_points;

                    if(remaining_min === undefined || CompareDates(remaining_min, remaining.min) < 0)
                        remaining_min = remaining.min;
                    if(remaining_max === undefined || CompareDates(remaining.max, remaining_max) > 0)
                        remaining_max = remaining.max;
                }
            }
        );

        // ----------------------------------------------------------------------
        function ToAverageDate(estimated_time: number, estimated_points: number): Date | undefined {
            if(estimated_points === 0)
                return undefined;

            let result = new Date();

            result.setTime(estimated_time / estimated_points);
            result.setHours(0, 0, 0, 0);

            return result;
        }

        // ----------------------------------------------------------------------

        if(estimated_min === undefined)
            this.estimated_dates = undefined;
        else
            this.estimated_dates = new StatsInfo<Date>(
                ToAverageDate(estimated_time, estimated_points),
                estimated_min,
                estimated_max,
            );

        if(remaining_min === undefined)
            this.remaining_dates = undefined;
        else
            this.remaining_dates = new StatsInfo<Date>(
                ToAverageDate(remaining_time, remaining_points),
                remaining_min,
                remaining_max,
            );

        this.velocity_overrides = velocity_overrides;
    }
}


export function CreateTimelineEvents(
    input_events: TimelineInputEvent[],     // Must be in ascending order according to `date`
    days_in_sprint: number,
    any_sprint_boundary: Date,
    points_per_unestimated_item: number,
    use_previous_n_sprints_for_average_velocity?: number,   // When calculating velocity, look at the last N sprints. Default is to look at all sprints.
): TimelineOutputEvent[] {
    // ----------------------------------------------------------------------
    class VelocityData {
        public velocities: Array<number | undefined>;
        public prev_total_points_completed: number | undefined;

        public calculated_velocity: StatsInfo<number> | undefined = undefined;

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
                if(use_previous_n_sprints_for_average_velocity !== undefined && this.velocities.length > use_previous_n_sprints_for_average_velocity)
                    return this.velocities.length - use_previous_n_sprints_for_average_velocity;

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

                if(velocity !== 0)
                    num_sprints += 1;

                if(velocity !== 0 && (min_v === undefined || velocity < min_v))
                    min_v = velocity;
                if(max_v === undefined || velocity > max_v)
                    max_v = velocity;
            }

            this.calculated_velocity = new StatsInfo<number>(num_sprints ? total_points / num_sprints : 0, min_v || max_v, max_v);
        }
    }

    // ----------------------------------------------------------------------
    let velocity_data_items: Record<string | undefined, VelocityData> = {};
    let results: TimelineOutputEvent[] = []

    function CommitDateInfo(date: Date, input_event_start_index: number, input_event_end_index: number): TimelineOutputEvent {
        const is_sprint_boundary = _AlignDateToSprintBoundary(
            any_sprint_boundary,
            days_in_sprint,
            date,
        ).getTime() === date.getTime();

        // Update velocities if we are looking at a sprint boundary
        if(is_sprint_boundary) {
            let recognized_teams = new Set<string>(Object.keys(velocity_data_items));

            for(let index = input_event_start_index; index != input_event_end_index; index++) {
                const event = input_events[index];
                const team_name = event.team || "";

                if(recognized_teams.has(team_name)) {
                    recognized_teams.delete(team_name);
                    velocity_data_items[team_name].UpdateVelocity(event.total_points_completed);
                }
                else
                    velocity_data_items[team_name] = new VelocityData(event.total_points_completed);
            }

            recognized_teams.forEach(
                (team_name) => {
                    velocity_data_items[team_name].UpdateVelocity(undefined);
                }
            );
        }

        // Calculate the team info
        let team_data: Record<string | undefined, TimelineOutputEventTeamData> = {};

        for(let index = input_event_start_index; index != input_event_end_index; index++) {
            const event = input_events[index];
            const velocity_info = (
                () => {
                    const velocity_data_item = velocity_data_items[event.team || ""];

                    if(velocity_data_item === undefined)
                        return undefined;

                    return velocity_data_item.calculated_velocity;
                }
            )();

            team_data[event.team] = new TimelineOutputEventTeamData(
                event.total_points_completed,
                event.total_points_pending,
                event.total_points_active,
                event.total_points_estimated,
                event.num_unestimated_items,
                event.num_unestimated_items * points_per_unestimated_item,
                velocity_info,
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
            is_generated,
            team_data,
        );
    }

    let index = 0;
    let expected_date: Date | undefined = undefined;

    while(index !== input_events.length) {
        const this_date = ToDate(input_events[index].date);

        // @ts-ignore: isNaN
        if(!(this_date instanceof Date && !isNaN(this_date)))
            throw new Error(`Invalid date, index '${index}'.`);

        // Fill in missing dates
        if(expected_date !== undefined) {
            while(expected_date.getTime() !== this_date.getTime()) {
                results.push(CommitDateInfo(expected_date, index, index));
                expected_date = IncrementDate(expected_date);
            }
        }

        // Group all input events associated with this day
        const starting_index = index;

        while(index !== input_events.length && ToDate(input_events[index].date).getTime() == this_date.getTime())
            index += 1;

        // Commit the values
        results.push(CommitDateInfo(this_date, starting_index, index));
        expected_date = IncrementDate(this_date);
    }

    return results;
}


export function NextSprintBoundary(
    any_sprint_boundary: Date,
    days_in_sprint: number,
    date: Date,
): Date {
    let result = _AlignDateToSprintBoundary(any_sprint_boundary, days_in_sprint, date);

    if(CompareDates(result, date) === 0)
        result = _AlignDateToSprintBoundary(any_sprint_boundary, days_in_sprint, IncrementDate(date));

    return result;
}


export function IncrementDate(date: Date, days: number=1): Date {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}


// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
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

    return IncrementDate(any_sprint_boundary, sprints_diff * days_in_sprint);
}
