package com.signbridge.project.dto;

import java.util.List;

public record ContactRequestLists(List<ContactRequestView> incoming, List<ContactRequestView> outgoing) {
}
