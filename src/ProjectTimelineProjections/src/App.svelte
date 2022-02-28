<script lang="ts">
    import { onMount } from "svelte";

    import TimelineProjections from './lib/TimelineProjections.svelte';
    import TimelineProjectionsGlobal from './lib/TimelineProjectionsGlobal.svelte';
    //import sample_input from './assets/sample_input.json'
    import initial_project from './assets/initial_project.json'

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    let _title: string;
    let _description: string;
    let _image: string;
    let _events: any;
    let _any_sprint_boundary: Date;
    let _debug_mode = false;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _initialized: boolean = false;

    onMount(
        async () => {
            const urlParams = new URLSearchParams(window.location.search);

            if(urlParams.has("data")) {
                return fetch(
                    urlParams.get("data"),
                    {
                        "cache": "no-cache",
                        "method": "GET",
                    },
                )
                    .then(
                        (response) => {
                            if(response.status !== 200) {
                                console.log(`ERROR: '${response.url}' returned '${response.statusText}' (${response.status})`);
                                return;
                            }

                            return response.json().then(
                                (json) => {
                                    // ----------------------------------------------------------------------
                                    function GetData(key: string, is_required: boolean) {
                                        if(!json.hasOwnProperty(key)) {
                                            if(is_required)
                                                console.log(`ERROR: The key '${key}' was not found in the returned data`);

                                            return;
                                        }

                                        return json[key];
                                    }

                                    // ----------------------------------------------------------------------

                                    _any_sprint_boundary = new Date(GetData("any_sprint_boundary", true));

                                    _description = GetData("description", false);
                                    _image = GetData("image", false);

                                    _title = GetData("title", true);

                                    const events = GetData("events", true);

                                    if(events === undefined)
                                        return
                                    else if(typeof events === "string")
                                        // Get the actual events
                                        return fetch(
                                            events,
                                            {
                                                "cache": "no-cache",
                                                "method": "GET",
                                            },
                                        )
                                            .then(
                                                (response) => {
                                                    if(response.status !== 200) {
                                                        console.log(`ERROR: '${response.url}' returned '${response.statusText}' (${response.status})`);
                                                        return;
                                                    }

                                                    return response.json().then(
                                                        (response) => {
                                                            _events = response;
                                                        }
                                                    );
                                                }
                                            );
                                    else
                                        _events = events;
                                }
                            );
                        }
                    );
            }

            _events = initial_project;
            _any_sprint_boundary = new Date("2022-2-23");
            _title = "Project Projections";
        }
    );

    $: {
        if(!_initialized) {
            const initialized = _events !== undefined;

            if(initialized) {
            _initialized = initialized;
            }
        }
    }
</script>

<main>
    {#if _initialized}
        <TimelineProjectionsGlobal />

        <TimelineProjections
            title={_title}
            description={_description}
            image={_image}
            events={_events}
            any_sprint_boundary={_any_sprint_boundary}
            debug_mode={_debug_mode}
        />
    {/if}
</main>

<style lang="sass">
    :root
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif

    main
        position: absolute
        left: 0
        top: 0
        right: 0
        bottom: 0

        padding: 10px
        margin: 0px

        :global(.timeline-projections)
            padding-bottom: 20px
</style>
