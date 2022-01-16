# ----------------------------------------------------------------------
# |
# |  Build.py
# |
# |  David Brownell <db@DavidBrownell.com>
# |      2021-12-30 10:02:14
# |
# ----------------------------------------------------------------------
# |
# |  Copyright David Brownell 2021-22
# |  Distributed under the Boost Software License, Version 1.0. See
# |  accompanying file LICENSE_1_0.txt or copy at
# |  http://www.boost.org/LICENSE_1_0.txt.
# |
# ----------------------------------------------------------------------
"""Builds the ProjectTimelineProjections website"""

import os
import sys
import textwrap

from io import StringIO

import CommonEnvironment
from CommonEnvironment import BuildImpl
from CommonEnvironment.CallOnExit import CallOnExit
from CommonEnvironment import CommandLine
from CommonEnvironment import FileSystem
from CommonEnvironment import Process
from CommonEnvironment.StreamDecorator import StreamDecorator

# ----------------------------------------------------------------------
_script_fullpath                            = CommonEnvironment.ThisFullpath()
_script_dir, _script_name                   = os.path.split(_script_fullpath)
# ----------------------------------------------------------------------

# ----------------------------------------------------------------------
@CommandLine.EntryPoint
@CommandLine.Constraints(
    output_dir=CommandLine.DirectoryTypeInfo(
        ensure_exists=False,
    ),
    output_stream=None,
)
def Build(
    output_dir,
    output_stream=sys.stdout,
    verbose=False,
):
    with StreamDecorator(output_stream).DoneManager(
        line_prefix="",
        prefix="\nResults: ",
        suffix="\n",
    ) as dm:
        if not _Execute(
            verbose,
            "Checking...",
            "npm run check",
            dm,
        ):
            return dm.result

        if not _Execute(
            verbose,
            "Building...",
            "npm run build",
            dm,
        ):
            return dm.result

        dm.stream.write("Copying...")
        with dm.stream.DoneManager() as copy_dm:
            source_dir = os.path.join(_script_dir, "dist")
            assert os.path.isdir(source_dir), source_dir

            temp_output_dir = "{}.tmp".format(output_dir)

            FileSystem.CopyTree(
                source_dir,
                temp_output_dir,
                optional_output_stream=copy_dm.stream if verbose else None,
            )

            FileSystem.RemoveTree(source_dir)
            FileSystem.RemoveTree(output_dir)
            os.rename(temp_output_dir, output_dir)

        return dm.result


# ----------------------------------------------------------------------
@CommandLine.EntryPoint
@CommandLine.Constraints(
    output_dir=CommandLine.DirectoryTypeInfo(),
    output_stream=None,
)
def Clean(
    output_dir,
    output_stream=sys.stdout,
):
    with StreamDecorator(output_stream).DoneManager(
        line_prefix="",
        prefix="\nResults: ",
        suffix="\n",
    ) as dm:
        FileSystem.RemoveTree(output_dir)
        dm.stream.write("'{}' has been removed.\n".format(output_dir))

        return dm.result


# ----------------------------------------------------------------------
@CommandLine.EntryPoint
@CommandLine.Constraints(
    output_stream=None,
)
def Install(
    output_stream=sys.stdout,
    verbose=False,
):
    with StreamDecorator(output_stream).DoneManager(
        line_prefix="",
        prefix="\nResults: ",
        suffix="\n",
    ) as dm:
        _Execute(
            verbose,
            "Installing...",
            "npm install",
            dm,
        )

        return dm.result


# ----------------------------------------------------------------------
@CommandLine.EntryPoint
@CommandLine.Constraints(
    output_stream=None,
)
def Dev(
    output_stream=sys.stdout,
):
    with StreamDecorator(output_stream).DoneManager(
        line_prefix="",
        prefix="\nResults: ",
        suffix="\n",
    ) as dm:
        dm.stream.write(
            textwrap.dedent(
                """\

                Running:
                    npm run dev


                -----------------------------------------------------------------------------------
                Running this command locally is a much better experience; this functionality exists
                mostly for documentation purposes to help those unfamiliar with web developemnt to
                get up-and=running more quickly.
                -----------------------------------------------------------------------------------


                """,
            ),
        )

        _Execute(
            True,
            "Serving...",
            "npm run dev",
            dm,
        )

        return dm.result


# ----------------------------------------------------------------------
# ----------------------------------------------------------------------
# ----------------------------------------------------------------------
def _Execute(
    verbose: bool,
    desc: str,
    command: str,
    dm,
) -> bool:
    dm.stream.write(desc)
    with dm.stream.DoneManager(
        suffix="\n" if verbose else None,
    ) as this_dm:
        previous_dir = os.getcwd()

        os.chdir(_script_dir)
        with CallOnExit(lambda: os.chdir(previous_dir)):
            sink = StringIO()

            streams = [sink]

            if verbose:
                streams.append(this_dm.stream)

            this_dm.result = Process.Execute(command, StreamDecorator(streams))

            if this_dm.result != 0:
                if not verbose:
                    this_dm.stream.write(sink.getvalue())

        return this_dm.result == 0


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        sys.exit(
            BuildImpl.Main(
                BuildImpl.Configuration(
                    name="ProjectTimelineProjections",
                    requires_output_dir=True,
                    priority=1,
                ),
            ),
        )
    except KeyboardInterrupt:
        pass
