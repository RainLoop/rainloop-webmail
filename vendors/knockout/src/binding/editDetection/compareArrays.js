// Go through the items that have been added and deleted and try to find matches between them.
ko.utils.findMovesInArrayComparison = (left, right, limitFailedCompares) => {
    var failedCompares = 0, r, l = right.length;
    l && left.every(leftItem => {
        r = right.findIndex(rightItem => leftItem['value'] === rightItem['value']);
        if (r >= 0) {
            leftItem['moved'] = right[r]['index'];
            right[r]['moved'] = leftItem['index'];
            right.splice(r, 1);         // This item is marked as moved; so remove it from right list
//            right[r] = null;
            failedCompares = r = 0;     // Reset failed compares count because we're checking for consecutive failures
            --l;
        }
        failedCompares += l;
        return l && (!limitFailedCompares || failedCompares < limitFailedCompares);
    });
};

ko.utils.compareArrays = (() => {
    var statusNotInOld = 'added', statusNotInNew = 'deleted',

    compareSmallArrayToBigArray = (smlArray, bigArray, statusNotInSml, statusNotInBig, options) => {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex = -1, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, prevRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        while (++smlIndex <= smlIndexMax) {
            prevRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = prevRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = prevRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        smlIndex = smlIndexMax;
        bigIndex = bigIndexMax
        while (smlIndex || bigIndex) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                --bigIndex;
                --smlIndex;
                if (!options['sparse']) {
                    editScript.push({
                        'status': "retained",
                        'value': bigArray[bigIndex] });
                }
            }
        }

        // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
        // smlIndexMax keeps the time complexity of this algorithm linear.
        ko.utils.findMovesInArrayComparison(notInBig, notInSml, smlIndexMax * 10);

        return editScript.reverse();
    };

    // Simple calculation based on Levenshtein distance.
    return (oldArray, newArray, options) => {
        oldArray = oldArray || [];
        newArray = newArray || [];

        return (oldArray.length < newArray.length)
            ? compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, options)
            : compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, options);
    };
})();
