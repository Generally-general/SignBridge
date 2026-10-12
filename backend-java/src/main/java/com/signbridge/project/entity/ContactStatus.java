package com.signbridge.project.entity;

public enum ContactStatus {
    PENDING,   // request sent, not answered
    ACCEPTED,  // they are contacts of each other
    DECLINED   // receiver said no (silent: the sender is not told)
}
