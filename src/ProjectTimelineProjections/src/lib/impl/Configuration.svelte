<!--
----------------------------------------------------------------------
|
|  Configuration.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-14 16:56:12
|
----------------------------------------------------------------------
|
|  Copyright David Brownell 2022
|  Distributed under the Boost Software License, Version 1.0. See
|  accompanying file LICENSE_1_0.txt or copy at
|  http://www.boost.org/LICENSE_1_0.txt.
|
----------------------------------------------------------------------
-->

<!--
----------------------------------------------------------------------
|
|  Code
|
----------------------------------------------------------------------
-->
<script lang=ts>
    import { Colors } from './SharedTypes';
    import {
        Configuration as ConfigurationType,
        StatsInfo,
    } from './SharedTypes';

    import { createEventDispatcher } from 'svelte';

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let config: ConfigurationType;
    export let debug_mode: boolean = false;

    // Events
    //      config_change: {config: ConfigurationType}

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _debug_colors = new Colors();

    let _working_config: ConfigurationType;

    let _any_sprint_boundary_string: string;
    let _velocity_overrides: StatsInfo<number> | undefined;

    let _use_previous_n_sprints_check: boolean;
    let _velocity_overrides_check: boolean;

    let _use_previous_n_sprints_element: HTMLInputElement;
    let _unestimated_min_element: HTMLInputElement;
    let _unestimated_max_element: HTMLInputElement;
    let _velocity_overrides_min_element: HTMLInputElement;
    let _velocity_overrides_avg_element: HTMLInputElement;
    let _velocity_overrides_max_element: HTMLInputElement;

    let _any_sprint_boundary_error: boolean = false;
    let _days_in_sprint_error: boolean = false;
    let _points_per_unestimated_error: boolean = false;
    let _use_previous_n_sprints_error: boolean = false;
    let _unestimated_velocity_factors_min_error: boolean = false;
    let _unestimated_velocity_factors_max_error: boolean = false;
    let _velocity_overrides_min_error: boolean = false;
    let _velocity_overrides_avg_error: boolean = false;
    let _velocity_overrides_max_error: boolean = false;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _initialized = false;

    // Initiation
    $: {
        if(!_initialized) {
            const initialized = config !== undefined;

            if(initialized) {
                _working_config = config.Copy();

                _any_sprint_boundary_string = _working_config.any_sprint_boundary.toISOString().split('T')[0];
                _velocity_overrides = _working_config.velocity_overrides;

                _use_previous_n_sprints_check = _working_config.use_previous_n_sprints_for_average_velocity !== undefined;
                _velocity_overrides_check = _working_config.velocity_overrides !== undefined;
            }

            _initialized = initialized;
        }
    }

    // ----------------------------------------------------------------------
    function OnAnySprintBoundary(event) {
        if(!event.target.value) {
            _any_sprint_boundary_error = true;
            return;
        }

        _any_sprint_boundary_error = false;
        _any_sprint_boundary_string = event.target.value;

        _working_config.any_sprint_boundary = new Date(_any_sprint_boundary_string);

        _OnChange();
    }

    // ----------------------------------------------------------------------
    function OnDaysInSprint(event) {
        const value = _ExtractEventValue(event);

        if(value == undefined) {
            _days_in_sprint_error = true;
            return;
        }

        _days_in_sprint_error = false;
        _working_config.days_in_sprint = value;

        _OnChange();
    }

    // ----------------------------------------------------------------------
    function OnPointsPerUnestimatedItem(event) {
        const value = _ExtractEventValue(event);

        if(value === undefined) {
            _points_per_unestimated_error = true;
            return;
        }

        _points_per_unestimated_error = false;
        _working_config.points_per_unestimated_item = value;

        _OnChange();
    }

    // ----------------------------------------------------------------------
    function OnUsePreviousNSprints(event) {
        if(event.target.classList.contains("use-previous-n-sprints-check")) {
            _use_previous_n_sprints_check = !_use_previous_n_sprints_check;
        }
        else if(event.target.classList.contains("use_previous_n_sprints_input")) {
            const value = _ExtractEventValue(event);

            if(value === undefined) {
                _use_previous_n_sprints_error = true;
                return;
            }

            _working_config.use_previous_n_sprints_for_average_velocity = value;
        }

        if(_use_previous_n_sprints_check) {
            const value = _ExtractNumberValue(_use_previous_n_sprints_element);

            if(value === undefined) {
                _use_previous_n_sprints_error = true;
                return;
            }

            _working_config.use_previous_n_sprints_for_average_velocity = value;
        }
        else
            _working_config.use_previous_n_sprints_for_average_velocity = undefined;

        _use_previous_n_sprints_error = false;
        _OnChange();
    }

    // ----------------------------------------------------------------------
    function OnUnestimatedVelocityFactors(event) {
        const value = _ExtractEventValue(event);

        if(value === undefined) {
            if(event.target.classList.contains("min"))
                _unestimated_velocity_factors_min_error = true;
            else if(event.target.classList.contains("max"))
                _unestimated_velocity_factors_max_error = true;

            return;
        }

        const min_value = _ExtractNumberValue(_unestimated_min_element);
        const max_value = _ExtractNumberValue(_unestimated_max_element);

        const error = min_value > max_value;

        _unestimated_velocity_factors_min_error = error;
        _unestimated_velocity_factors_max_error = error;

        if(error)
            return;

        _working_config.unestimated_velocity_factors = [min_value, max_value];

        _OnChange();
    }

    // ----------------------------------------------------------------------
    function OnVelocityOverrides(event) {
        if(event.target.classList.contains("velocity-overrides-check")) {
            _velocity_overrides_check = !_velocity_overrides_check;
        }
        else {
            const value = _ExtractEventValue(event);

            if(value === undefined) {
                if(event.target.classList.contains("min"))
                    _velocity_overrides_min_error = true;
                if(event.target.classList.contains("avg"))
                    _velocity_overrides_avg_error = true;
                if(event.target.classList.contains("max"))
                    _velocity_overrides_max_error = true;

                return;
            }
        }

        if(_velocity_overrides_check) {
            const min_value = _ExtractNumberValue(_velocity_overrides_min_element);
            const avg_value = _ExtractNumberValue(_velocity_overrides_avg_element);
            const max_value = _ExtractNumberValue(_velocity_overrides_max_element);
            let errors = false;

            if(min_value === undefined) {
                _velocity_overrides_min_error = true;
                errors = true;
            }
            if(avg_value === undefined) {
                _velocity_overrides_avg_error = true;
                errors = true;
            }
            if(max_value === undefined) {
                _velocity_overrides_max_error = true;
                errors = true;
            }

            if(errors)
                return;

            const error = (min_value > avg_value || avg_value > max_value);

            _velocity_overrides_min_error = error;
            _velocity_overrides_avg_error = error;
            _velocity_overrides_max_error = error;

            if(error)
                return;

            _velocity_overrides = new StatsInfo<number>(avg_value, min_value, max_value);
            _working_config.velocity_overrides = _velocity_overrides;
        }
        else {
            _working_config.velocity_overrides = undefined;

            _velocity_overrides_min_error = false;
            _velocity_overrides_avg_error = false;
            _velocity_overrides_max_error = false;
        }

        _OnChange();
    }

    // ----------------------------------------------------------------------
    function _ExtractEventValue(event): number | undefined {
        if(!event.target.value)
            return undefined;

        const value = Number(event.target.value);

        if(value <= 0)
            return undefined;

        return value;
    }

    // ----------------------------------------------------------------------
    function _ExtractNumberValue(element: HTMLInputElement): number | undefined {
        const value = element.value;

        if(!value)
            return undefined;

        return Number(value);
    }

    // ----------------------------------------------------------------------
    const dispatch = createEventDispatcher();

    function _OnChange() {
        if(
            _any_sprint_boundary_error
            || _days_in_sprint_error
            || _points_per_unestimated_error
            || _use_previous_n_sprints_error
            || _unestimated_velocity_factors_min_error
            || _unestimated_velocity_factors_max_error
            || _velocity_overrides_min_error
            || _velocity_overrides_avg_error
            || _velocity_overrides_max_error
        )
            return;

        dispatch("config_change", { config: _working_config });
    }

    // ----------------------------------------------------------------------

</script>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<div
    class=configuration
    style={debug_mode ? _debug_colors.Border() : ""}
>
    {#if _initialized}
        <div class=cols>
            <div class=label>Sprint Boundary:</div>
            <input
                type=date
                class={_any_sprint_boundary_error ? "error" : ""}
                value={_any_sprint_boundary_string}
                on:input={OnAnySprintBoundary}
            />

            <div class=label>Days in Sprint:</div>
            <input
                type=number
                min=1
                class={_days_in_sprint_error ? "error" : ""}
                value={_working_config.days_in_sprint}
                on:input={OnDaysInSprint}
            />

            <div class=label>Points per Unestimated Item:</div>
            <input
                type=number
                min=1
                class={_points_per_unestimated_error ? "error" : ""}
                value={_working_config.points_per_unestimated_item}
                on:input={OnPointsPerUnestimatedItem}
            />

            <div class="label unestimated-velocity-factors">Unestimated Velocity Factors</div>
            <div>Aggressive:</div>
            <input
                type=number
                min=0
                class={"min " + (_unestimated_velocity_factors_min_error ? "error" : "")}
                value={_working_config.unestimated_velocity_factors[0]}
                on:input={OnUnestimatedVelocityFactors}
                bind:this={_unestimated_min_element}
            />

            <div>Conservative:</div>
            <input
                type=number
                min=0
                class={"max " + (_unestimated_velocity_factors_max_error ? "error" : "")}
                value={_working_config.unestimated_velocity_factors[1]}
                on:input={OnUnestimatedVelocityFactors}
                bind:this={_unestimated_max_element}
            />

            <label class=use-previous-n-sprints-check>
                <input
                    type=checkbox
                    class="label use-previous-n-sprints-check"
                    on:input={OnUsePreviousNSprints}
                >
                Only use the previous number of sprints to calculate min, average, and max velocities:
            </label>
            <input
                type=number
                min=1
                class={"use-previous-n-sprints-input " + (_use_previous_n_sprints_error ? "error" : "")}
                value={_working_config.use_previous_n_sprints_for_average_velocity}
                disabled={!_use_previous_n_sprints_check}
                on:input={OnUsePreviousNSprints}
                bind:this={_use_previous_n_sprints_element}
            />

            <label class=velocity-overrides-check>
                <input
                    type=checkbox
                    class="label velocity-overrides-check"
                    on:input={OnVelocityOverrides}
                >
                Override velocity values when projecting dates:
            </label>

            <div>Min:</div>
            <input
                type=number
                min=0
                class={"min " + (_velocity_overrides_min_error ? "error" : "")}
                value={_velocity_overrides ? _velocity_overrides.min : ""}
                disabled={!_velocity_overrides_check}
                on:input={OnVelocityOverrides}
                bind:this={_velocity_overrides_min_element}
            />

            <div>Average:</div>
            <input
                type=number
                min=0
                class={"avg " + (_velocity_overrides_avg_error ? "error" : "")}
                value={_velocity_overrides ? _velocity_overrides.average : ""}
                disabled={!_velocity_overrides_check}
                on:input={OnVelocityOverrides}
                bind:this={_velocity_overrides_avg_element}
            />

            <div>Max:</div>
            <input
                type=number
                min=0
                class={"max " + (_velocity_overrides_max_error ? "error" : "")}
                value={_velocity_overrides ? _velocity_overrides.max : ""}
                disabled={!_velocity_overrides_check}
                on:input={OnVelocityOverrides}
                bind:this={_velocity_overrides_max_element}
            />
        </div>
    {/if}
</div>

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    $section-padding-size: 10px

    .configuration
        @import './Variables.sass'
        @include content-info-mixin

        .cols
            @include content-info-grid-mixin(160px 131px)

            input
                font-size: $content-info-font-size

            label.use-previous-n-sprints-check
                padding-top: $section-padding-size

            label.velocity-overrides-check
                padding-top: $section-padding-size
                grid-column: 1 / span 2

            .label.unestimated-velocity-factors
                padding-top: $section-padding-size
                grid-column: 1 / span 2

            .error
                background-color: red
</style>
