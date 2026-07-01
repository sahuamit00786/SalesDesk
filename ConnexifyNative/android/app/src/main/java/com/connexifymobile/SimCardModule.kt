package com.connexifymobile

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import com.facebook.react.bridge.*

class SimCardModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SimCardModule"

    @SuppressLint("MissingPermission", "HardwareIds")
    @ReactMethod
    fun getSimCards(promise: Promise) {
        try {
            val context = reactApplicationContext
            val result = Arguments.createArray()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE)
                        as SubscriptionManager
                val subs = sm.activeSubscriptionInfoList ?: emptyList()

                for (sub in subs) {
                    val map = Arguments.createMap()
                    map.putInt("subscriptionId", sub.subscriptionId)
                    map.putInt("slotIndex", sub.simSlotIndex)
                    map.putString("carrierName", sub.carrierName?.toString() ?: "Unknown")
                    map.putString("displayName", sub.displayName?.toString() ?: "SIM ${sub.simSlotIndex + 1}")
                    map.putString("number", sub.number ?: "")
                    map.putInt("iconTint", sub.iconTint)
                    result.pushMap(map)
                }
            } else {
                val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                val map = Arguments.createMap()
                map.putInt("subscriptionId", 0)
                map.putInt("slotIndex", 0)
                map.putString("carrierName", tm.networkOperatorName ?: "SIM 1")
                map.putString("displayName", "SIM 1")
                map.putString("number", "")
                map.putInt("iconTint", -16776961)
                result.pushMap(map)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SIM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCallLogsForSim(subscriptionId: Int, limit: Int, promise: Promise) {
        try {
            val result = Arguments.createArray()
            val projection = arrayOf(
                android.provider.CallLog.Calls.NUMBER,
                android.provider.CallLog.Calls.CACHED_NAME,
                android.provider.CallLog.Calls.TYPE,
                android.provider.CallLog.Calls.DATE,
                android.provider.CallLog.Calls.DURATION,
                android.provider.CallLog.Calls.PHONE_ACCOUNT_ID,
            )

            val cursor = reactApplicationContext.contentResolver.query(
                android.provider.CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                "${android.provider.CallLog.Calls.DATE} DESC",
            )

            var count = 0
            cursor?.use { c ->
                val colNumber   = c.getColumnIndex(android.provider.CallLog.Calls.NUMBER)
                val colName     = c.getColumnIndex(android.provider.CallLog.Calls.CACHED_NAME)
                val colType     = c.getColumnIndex(android.provider.CallLog.Calls.TYPE)
                val colDate     = c.getColumnIndex(android.provider.CallLog.Calls.DATE)
                val colDuration = c.getColumnIndex(android.provider.CallLog.Calls.DURATION)
                val colAccId    = c.getColumnIndex(android.provider.CallLog.Calls.PHONE_ACCOUNT_ID)

                while (c.moveToNext() && count < limit) {
                    val accountId = if (colAccId >= 0) c.getString(colAccId) ?: "" else ""

                    // subscriptionId == -1 means "all SIMs"
                    if (subscriptionId != -1 && accountId.isNotEmpty() && accountId != subscriptionId.toString()) {
                        continue
                    }

                    val map = Arguments.createMap()
                    map.putString("phoneNumber",    if (colNumber   >= 0) c.getString(colNumber) ?: "" else "")
                    map.putString("name",           if (colName     >= 0) c.getString(colName)   ?: "" else "")
                    map.putInt("callType",          if (colType     >= 0) c.getInt(colType)       else 0)
                    map.putDouble("callDate",       if (colDate     >= 0) c.getLong(colDate).toDouble() else 0.0)
                    map.putInt("callDuration",      if (colDuration >= 0) c.getInt(colDuration)   else 0)
                    map.putString("subscriptionId", accountId)
                    result.pushMap(map)
                    count++
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CALL_LOG_ERROR", e.message, e)
        }
    }
}
