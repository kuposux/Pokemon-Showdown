#!/bin/bash
. /lib/lsb/init-functions

runAsUser="pokemonshowdown"
scriptDir="/home/pokemonshowdown/Pokemon-Showdown"
scriptCommand="app.js"
pidFile="/home/pokemonshowdown/pokemon-showdown.pid"
logFile="/home/pokemonshowdown/pokemon-showdown.log"

touch "$pidFile" "$logFile"
chown $runAsUser "$pidFile" "$logFile"

start()
{
    foreverid=`getForeverid`
    if [ "$foreverid" != "" ]
    then
        echo "Pokemon Showdown server already running."
    else
        pushd $scriptDir > /dev/null
        log_begin_msg "Starting Pokemon Showdown server"
        sleep 1
        forever start --pidFile "$pidFile" -a -l "$logFile" $scriptCommand > /dev/null
        log_end_msg $?
        popd > /dev/null
    fi
}

stop()
{
    foreverid=`getForeverid`
    if [ "$foreverid" == "" ]
    then
        echo "Pokemon Showdown server is not running."
    else
        pushd $scriptDir > /dev/null
        log_begin_msg "Stopping Pokemon Showdown server"
        forever stop $foreverid > /dev/null
        log_end_msg $?
        popd > /dev/null
    fi
}

status()
{
    foreverid=`getForeverid`
    if [ "$foreverid" == "" ]
    then
        echo "Pokemon Showdown server is not running."
    else
        forever list | sed -n "/\[$foreverid\]/p"
    fi
}

getForeverid()
{
    pid=`cat "$pidFile"`
    if [ "$pid" != "" ]
    then
        echo -n `forever list | sed -n "/ $pid /p" | sed "s/.*\[\([0-9]\+\)\].* $pid .*/\1/g"`
    else
        echo -n ""
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        stop
        start
        ;;
    *)
        echo $"Usage: $0 {start|stop|restart|status}"
        exit 1
esac
exit 0
